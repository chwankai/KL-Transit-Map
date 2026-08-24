#!/usr/bin/env python3
import os, csv, json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BASE_GTFS_DIR = os.path.join(PROJECT_ROOT, "docs", "rapid_bus_kl")
OUTPUT_JSON = os.path.join(PROJECT_ROOT, "public", "rapid_bus_data.json")

def load_csv(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def get_corridor_color(route_name):
    # Standard RapidKL Corridor Colors
    name = route_name.upper().strip()
    if name.startswith("T"):
        return "#10b981" # Green for MRT/LRT feeder
    if name.startswith("1"):
        return "#3b82f6" # Jalan Ipoh corridor (Blue)
    if name.startswith("2"):
        return "#8b5cf6" # Jalan Pahang / Setapak corridor (Purple)
    if name.startswith("3"):
        return "#ec4899" # Ampang corridor (Pink)
    if name.startswith("4"):
        return "#f97316" # Cheras corridor (Orange)
    if name.startswith("5"):
        return "#eab308" # Sungai Besi corridor (Yellow)
    if name.startswith("6"):
        return "#06b6d4" # Jalan Klang Lama corridor (Cyan)
    if name.startswith("7"):
        return "#6366f1" # Federal Highway / Shah Alam / Klang corridor (Indigo)
    if name.startswith("8"):
        return "#14b8a6" # Damansara corridor (Teal)
    return "#3b82f6"

def build_data():
    all_routes = []
    route_map = {}
    stops_global = {}

    # Process both feeds
    feeds = ["rapid_bus_kl", "rapid_bus_mrtfeeder"]

    for feed in feeds:
        fdir = os.path.join(BASE_GTFS_DIR, feed)
        print(f"Processing feed: {feed} in {fdir} ...")

        routes_csv = load_csv(os.path.join(fdir, "routes.txt"))
        trips_csv = load_csv(os.path.join(fdir, "trips.txt"))
        stops_csv = load_csv(os.path.join(fdir, "stops.txt"))
        stop_times_csv = load_csv(os.path.join(fdir, "stop_times.txt"))
        shapes_csv = load_csv(os.path.join(fdir, "shapes.txt"))

        # Map stops
        for s in stops_csv:
            sid = s.get("stop_id")
            if sid and sid not in stops_global:
                try:
                    stops_global[sid] = {
                        "id": sid,
                        "name": s.get("stop_name", "").strip(),
                        "lat": round(float(s.get("stop_lat", 0)), 6),
                        "lng": round(float(s.get("stop_lon", 0)), 6)
                    }
                except ValueError:
                    pass

        # Group shapes by shape_id
        shapes_by_id = {}
        for row in shapes_csv:
            sh_id = row.get("shape_id")
            if not sh_id: continue
            try:
                pt = [round(float(row["shape_pt_lat"]), 5), round(float(row["shape_pt_lon"]), 5)]
                seq = int(row.get("shape_pt_sequence", 0))
                if sh_id not in shapes_by_id:
                    shapes_by_id[sh_id] = []
                shapes_by_id[sh_id].append((seq, pt))
            except ValueError:
                pass

        # Sort shape points
        for sh_id in shapes_by_id:
            shapes_by_id[sh_id].sort(key=lambda x: x[0])
            shapes_by_id[sh_id] = [p[1] for p in shapes_by_id[sh_id]]

        # Map trips by route_id
        trips_by_route = {}
        for t in trips_csv:
            rid = t.get("route_id")
            if not rid: continue
            if rid not in trips_by_route:
                trips_by_route[rid] = []
            trips_by_route[rid].append(t)

        # Map stop_times by trip_id
        stop_times_by_trip = {}
        for st in stop_times_csv:
            tid = st.get("trip_id")
            if not tid: continue
            if tid not in stop_times_by_trip:
                stop_times_by_trip[tid] = []
            try:
                seq = int(st.get("stop_sequence", 0))
                sid = st.get("stop_id")
                stop_times_by_trip[tid].append((seq, sid))
            except ValueError:
                pass

        for tid in stop_times_by_trip:
            stop_times_by_trip[tid].sort(key=lambda x: x[0])
            stop_times_by_trip[tid] = [x[1] for x in stop_times_by_trip[tid]]

        # Process routes
        for r in routes_csv:
            rid = r.get("route_id", "").strip()
            if not rid: continue

            short_name = r.get("route_short_name", "").strip()
            long_name = r.get("route_long_name", "").strip()

            # Skip BRT Sunway (requested by user as BRT is in rail map)
            if rid == "B1000" or short_name.upper() == "SUNWAY LINE" or "BRT USJ 7" in long_name:
                print(f"  Skipping BRT route: {rid} ({short_name})")
                continue

            # If short name is empty (like in feeder GTFS where route_long_name has T117)
            if not short_name and long_name:
                short_name = long_name

            # Find best trip and headsign
            r_trips = trips_by_route.get(rid, [])
            best_trip = r_trips[0] if r_trips else None
            headsign = ""
            shape_pts = []
            route_stops = []

            if best_trip:
                headsign = best_trip.get("trip_headsign", "").strip()
                sh_id = best_trip.get("shape_id")
                if sh_id and sh_id in shapes_by_id:
                    shape_pts = shapes_by_id[sh_id]
                
                # Get stops
                tid = best_trip.get("trip_id")
                if tid and tid in stop_times_by_trip:
                    for sid in stop_times_by_trip[tid]:
                        if sid in stops_global:
                            st = stops_global[sid]
                            route_stops.append({
                                "id": st["id"],
                                "name": st["name"],
                                "lat": st["lat"],
                                "lng": st["lng"]
                            })

            # If long_name is just the route number e.g. "T117", use headsign as long_name
            desc = long_name
            if headsign and (not long_name or long_name == short_name):
                desc = headsign

            # Determine category
            category = "feeder" if short_name.upper().startswith("T") else "trunk"

            # Parse origin / destination
            orig_dest = desc.split("~") if "~" in desc else desc.split(" - ")
            orig = orig_dest[0].strip() if len(orig_dest) > 0 else ""
            dest = orig_dest[1].strip() if len(orig_dest) > 1 else ""

            # Simplify shape points to reduce file size (take 1 in every 2 points if > 100 pts)
            if len(shape_pts) > 120:
                shape_pts = shape_pts[::2]

            route_obj = {
                "id": rid,
                "name": short_name,
                "desc": desc,
                "origin": orig,
                "dest": dest,
                "category": category,
                "color": get_corridor_color(short_name),
                "stopCount": len(route_stops),
                "stops": route_stops,
                "path": shape_pts
            }

            all_routes.append(route_obj)
            route_map[rid] = route_obj
            # Also map short_name for flexible lookup
            if short_name not in route_map:
                route_map[short_name] = route_obj

    # Sort routes naturally by route name
    def sort_key(r):
        name = r["name"]
        is_t = name.startswith("T") or name.startswith("t")
        num_part = "".join(filter(str.isdigit, name))
        val = int(num_part) if num_part else 9999
        return (1 if is_t else 0, val, name)

    all_routes.sort(key=sort_key)

    output = {
        "routes": all_routes,
        "count": len(all_routes)
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"Successfully generated {OUTPUT_JSON} with {len(all_routes)} RapidKL routes!")

if __name__ == "__main__":
    build_data()
