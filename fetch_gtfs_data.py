#!/usr/bin/env python3
"""
fetch_gtfs_data.py
Downloads Prasarana GTFS ZIP and generates public/gtfs_data.json
containing per-line frequency windows + station arrival offsets.

The output structure uses station names (not stop_ids) as keys in offsets,
so the frontend can look up by station name directly.
"""

import urllib.request, json, io, zipfile, os, re

GTFS_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SCRIPT_DIR, "public", "gtfs_data.json")

TRIP_ROUTE_TO_LINE = {
    "AG": "AG", "KJ": "KJ", "PH": "SP",
    "KGL": "KG", "PYL": "PY", "MR": "MR",
    "BRT": "BRT", "SA": "SA",
}

import csv

def fetch_zip(url):
    local_path = "/tmp/gtfs_rail.zip"
    if os.path.exists(local_path):
        print(f"Using cached zip at {local_path} ...")
        with open(local_path, "rb") as f:
            return f.read()
    print(f"Downloading {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        try:
            with open(local_path, "wb") as f:
                f.write(data)
        except: pass
        print(f"  {len(data):,} bytes downloaded")
        return data
    except Exception as e:
        print(f"Download failed: {e}. Trying to find cached zip at {local_path}...")
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        raise e

def read_csv(zf, fname):
    with zf.open(fname) as f:
        text = f.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [row for row in reader]

def time_to_secs(t):
    p = t.strip().split(":")
    return int(p[0])*3600 + int(p[1])*60 + int(p[2])

def norm_name(s):
    # strip surrounding quotes if any
    s = s.strip().strip('"').strip("'").strip()
    s = s.upper()
    s = re.sub(r'\s+STATION\s*$', '', s)
    s = re.sub(r'\s+(LRT|MRT|MONORAIL|KTM)\s*$', '', s)
    return s.strip()

def main():
    zip_data = fetch_zip(GTFS_URL)
    zf = zipfile.ZipFile(io.BytesIO(zip_data))

    # stops: stop_id → norm name
    print("Parsing stops.txt...")
    stop_name = {}
    for row in read_csv(zf, "stops.txt"):
        sid, sname = row.get("stop_id",""), row.get("stop_name","")
        if sid and sname:
            stop_name[sid] = norm_name(sname)
    print(f"  {len(stop_name)} stops")

    # calendar
    print("Parsing calendar.txt...")
    calendar = {}
    for row in read_csv(zf, "calendar.txt"):
        sid = row.get("service_id","")
        if not sid: continue
        wday = any(row.get(d,"0")=="1" for d in ["monday","tuesday","wednesday","thursday","friday"])
        calendar[sid] = {"weekday": wday, "saturday": row.get("saturday","0")=="1", "sunday": row.get("sunday","0")=="1"}
    print(f"  {len(calendar)} service entries")

    # trips
    print("Parsing trips.txt...")
    trip_meta = {}
    for row in read_csv(zf, "trips.txt"):
        tid = row.get("trip_id","")
        rid = row.get("route_id","")
        line_id = TRIP_ROUTE_TO_LINE.get(rid)
        if not line_id: continue
        trip_meta[tid] = {"line_id": line_id, "service_id": row.get("service_id",""),
                          "headsign": row.get("trip_headsign",""), "direction_id": row.get("direction_id","0")}
    print(f"  {len(trip_meta)} trips")

    # frequencies
    print("Parsing frequencies.txt...")
    freq_by_trip = {}
    for row in read_csv(zf, "frequencies.txt"):
        tid = row.get("trip_id","")
        if tid not in trip_meta: continue
        try:
            freq_by_trip.setdefault(tid, []).append({
                "start_secs": time_to_secs(row["start_time"]),
                "end_secs": time_to_secs(row["end_time"]),
                "headway_secs": int(row["headway_secs"]),
            })
        except: pass
    print(f"  {len(freq_by_trip)} trips with frequencies")

    # stop_times: trip_id → sorted stops with offset from first stop
    print("Parsing stop_times.txt...")
    st_rows = read_csv(zf, "stop_times.txt")
    print(f"  {len(st_rows):,} rows")

    stops_by_trip = {}
    for row in st_rows:
        tid = row.get("trip_id","")
        if tid not in trip_meta: continue
        try:
            arr_secs = time_to_secs(row.get("arrival_time","0:00:00"))
            seq = int(row.get("stop_sequence","0"))
        except: continue
        stops_by_trip.setdefault(tid, []).append({"stop_id": row.get("stop_id",""), "arr": arr_secs, "seq": seq})

    # Build offset map: trip_id → {station_name: offset_secs}
    offset_by_trip = {}  # trip_id → {norm_station_name: offset_secs}
    for tid, slist in stops_by_trip.items():
        slist.sort(key=lambda x: x["seq"])
        base = slist[0]["arr"]
        offset_by_trip[tid] = {}
        for s in slist:
            sname = stop_name.get(s["stop_id"])
            if sname:
                offset_by_trip[tid][sname] = s["arr"] - base

    # Build output
    lines_out = {}
    for tid, meta in trip_meta.items():
        freqs = freq_by_trip.get(tid, [])
        offsets = offset_by_trip.get(tid, {})
        if not freqs or not offsets: continue

        line_id = meta["line_id"]
        headsign = meta["headsign"]
        service_id = meta["service_id"]

        lines_out.setdefault(line_id, {"directions": {}})
        lines_out[line_id]["directions"].setdefault(headsign, {"services": []})
        lines_out[line_id]["directions"][headsign]["services"].append({
            "service_id": service_id,
            "frequencies": freqs,
            "offsets": offsets,  # norm_station_name → secs
        })

    result = {"calendar": calendar, "lines": lines_out}

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\n✓ Wrote {OUT_FILE}")

    # Verify a sample
    for line_id in list(lines_out.keys())[:2]:
        for headsign, ddata in list(lines_out[line_id]["directions"].items())[:1]:
            svc = ddata["services"][0]
            offsets_sample = dict(list(svc["offsets"].items())[:5])
            print(f"\n  {line_id} / {headsign}")
            print(f"  service_id={svc['service_id']}, {len(svc['frequencies'])} freq windows")
            print(f"  Offsets sample: {offsets_sample}")

if __name__ == "__main__":
    main()
