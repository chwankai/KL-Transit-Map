#!/usr/bin/env python3
"""
fetch_schedules.py
Fetches the Prasarana GTFS ZIP (rapid-rail-kl) from data.gov.my
and rebuilds public/station_schedules.json with full timetable data.
Does NOT touch station_coords.json or rail_tracks.json.
"""

import urllib.request
import json
import io
import zipfile
import os
import re
from collections import defaultdict

GTFS_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SCRIPT_DIR, "public", "station_schedules.json")


def fetch_zip(url):
    print(f"Downloading {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    print(f"  -> Downloaded {len(data):,} bytes")
    return data


def read_csv(zf, filename):
    """Read a CSV from the ZIP into a list of dicts."""
    try:
        with zf.open(filename) as f:
            text = f.read().decode("utf-8-sig")  # handles BOM
        lines = text.strip().splitlines()
        if len(lines) < 2:
            return []
        headers = [h.strip() for h in lines[0].split(",")]
        rows = []
        for line in lines[1:]:
            vals = [v.strip() for v in line.split(",")]
            row = {headers[i]: vals[i] if i < len(vals) else "" for i in range(len(headers))}
            rows.append(row)
        return rows
    except Exception as e:
        print(f"  Warning: could not read {filename}: {e}")
        return []


def infer_line_id(route_id="", headsign=""):
    s = (route_id + " " + headsign).upper()
    if re.search(r'\bKJ\b|KELANA JAYA', s): return "KJ"
    if re.search(r'\bSP\b|SRI PETALING', s): return "SP"
    if re.search(r'\bAG\b|(?<!SRI )AMPANG', s): return "AG"
    if re.search(r'\bKG\b|KAJANG|PUTRAJAYA MRT', s): return "KG"
    if re.search(r'\bPY\b|PUTRAJAYA SENTRAL|PUTRAJAYA LINE', s): return "PY"
    if re.search(r'\bMR\b|MONORAIL', s): return "MR"
    if re.search(r'\bSB\b|BRT|SUNWAY', s): return "BRT"
    if re.search(r'\bSA\b|SHAH ALAM', s): return "SA"
    return None


def normalize_time(t):
    """Normalize GTFS time (may be >24:xx for past-midnight) to HH:MM."""
    parts = t.strip().split(":")
    if len(parts) < 2:
        return None
    h = int(parts[0]) % 24
    m = parts[1].zfill(2)
    return f"{h:02d}:{m}"


def normalize_station_name(name):
    """Remove trailing station qualifiers."""
    name = name.strip().upper()
    name = re.sub(r'\s+STATION\s*$', '', name)
    name = re.sub(r'\s+(LRT|MRT|MONORAIL|KTM)\s*$', '', name)
    return name.strip()


def main():
    # 1. Download ZIP
    zip_data = fetch_zip(GTFS_URL)
    zf = zipfile.ZipFile(io.BytesIO(zip_data))
    print(f"  ZIP contains: {[n for n in zf.namelist() if not n.startswith('__')]}\n")

    # 2. Stops
    print("Parsing stops.txt...")
    stops = read_csv(zf, "stops.txt")
    stop_name_by_id = {}
    for row in stops:
        sid = row.get("stop_id", "")
        sname = row.get("stop_name", "")
        if sid and sname:
            stop_name_by_id[sid] = sname.strip()
    print(f"  -> {len(stop_name_by_id)} stops")

    # 3. Trips
    print("Parsing trips.txt...")
    trips = read_csv(zf, "trips.txt")
    trip_by_id = {}
    for row in trips:
        tid = row.get("trip_id", "")
        if tid:
            trip_by_id[tid] = {
                "route_id": row.get("route_id", ""),
                "service_id": row.get("service_id", ""),
                "headsign": row.get("trip_headsign", ""),
                "direction_id": row.get("direction_id", "0"),
            }
    print(f"  -> {len(trip_by_id)} trips")

    # 4. Calendar
    print("Parsing calendar.txt...")
    calendar = {}
    for row in read_csv(zf, "calendar.txt"):
        sid = row.get("service_id", "")
        if not sid:
            continue
        weekday = any(row.get(d, "0") == "1" for d in ["monday","tuesday","wednesday","thursday","friday"])
        calendar[sid] = {
            "weekday": weekday,
            "saturday": row.get("saturday", "0") == "1",
            "sunday": row.get("sunday", "0") == "1",
        }
    print(f"  -> {len(calendar)} service calendar entries")

    # 5. Stop times
    print("Parsing stop_times.txt (large file)...")
    st_rows = read_csv(zf, "stop_times.txt")
    print(f"  -> {len(st_rows):,} rows")

    # Build stopId -> tripId -> departureTime
    raw_stop_times = defaultdict(dict)  # stop_id -> {trip_id: time}
    for row in st_rows:
        sid = row.get("stop_id", "")
        tid = row.get("trip_id", "")
        dep = row.get("departure_time", "") or row.get("arrival_time", "")
        if not (sid and tid and dep):
            continue
        t = normalize_time(dep)
        if t:
            raw_stop_times[sid][tid] = t

    # 6. Build schedules
    print("\nBuilding schedules...")
    # station_norm_name -> lineId -> dirKey -> {weekday, saturday, sunday: [times]}
    schedules = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"weekday": [], "saturday": [], "sunday": []})))

    for stop_id, deps_by_trip in raw_stop_times.items():
        raw_name = stop_name_by_id.get(stop_id)
        if not raw_name:
            continue
        norm_name = normalize_station_name(raw_name)

        for trip_id, dep_time in deps_by_trip.items():
            trip = trip_by_id.get(trip_id)
            if not trip:
                continue
            line_id = infer_line_id(trip["route_id"], trip["headsign"])
            if not line_id:
                continue

            # Day classification
            svc_cal = calendar.get(trip["service_id"])
            day_types = []
            if svc_cal:
                if svc_cal["weekday"]: day_types.append("weekday")
                if svc_cal["saturday"]: day_types.append("saturday")
                if svc_cal["sunday"]: day_types.append("sunday")
            else:
                sid_lower = trip["service_id"].lower()
                if "sat" in sid_lower:
                    day_types = ["saturday"]
                elif "sun" in sid_lower:
                    day_types = ["sunday"]
                else:
                    day_types = ["weekday"]

            if not day_types:
                day_types = ["weekday"]

            dir_key = trip["headsign"] or f"Direction {trip['direction_id']}"

            for dt in day_types:
                schedules[norm_name][line_id][dir_key][dt].append(dep_time)

    # 7. Deduplicate and sort
    result = {}
    for station_name, line_data in sorted(schedules.items()):
        result[station_name] = {}
        for line_id, dir_data in sorted(line_data.items()):
            result[station_name][line_id] = {}
            for dir_key, times_data in sorted(dir_data.items()):
                result[station_name][line_id][dir_key] = {
                    dt: sorted(set(times)) for dt, times in times_data.items()
                }

    # 8. Write
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"\n✓ Wrote {len(result)} stations to {OUT_FILE}")

    # Sample output
    for station_name in list(result.keys())[:3]:
        print(f"\n  {station_name}:")
        for line_id, dir_data in result[station_name].items():
            for dir_key, times_data in dir_data.items():
                wday = times_data.get("weekday", [])
                print(f"    [{line_id}] {dir_key}: {wday[:5]} ... ({len(wday)} weekday deps)")


if __name__ == "__main__":
    main()
