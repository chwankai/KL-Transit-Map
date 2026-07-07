import csv
from collections import defaultdict
import math

def haversine(lat1, lon1, lat2, lon2):
    # Radius of the Earth in km
    R = 6371.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c

# Read stops
stops = {}
with open('scratch/extracted/stops.txt', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stops[row['stop_id']] = {
            'id': row['stop_id'],
            'name': row['stop_name'],
            'lat': float(row['stop_lat']),
            'lon': float(row['stop_lon']),
        }

# Read routes
routes = {}
with open('scratch/extracted/routes.txt', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        routes[row['route_id']] = {
            'id': row['route_id'],
            'short_name': row['route_short_name'],
            'long_name': row['route_long_name'],
            'color': row['route_color'],
        }

# Read trips to map trip_id to route_id
trip_routes = {}
with open('scratch/extracted/trips.txt', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trip_routes[row['trip_id']] = row['route_id']

# Read stop_times to find stop sequences for trips
trip_stops = defaultdict(list)
with open('scratch/extracted/stop_times.txt', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trip_stops[row['trip_id']].append((int(row['stop_sequence']), row['stop_id']))

# Sort stop sequences for each trip
for trip_id in trip_stops:
    trip_stops[trip_id].sort()

# Reconstruct unique stop sequences per route
route_sequences = defaultdict(set)
for trip_id, stop_list in trip_stops.items():
    route_id = trip_routes.get(trip_id)
    if route_id:
        sequence = tuple(stop_id for seq, stop_id in stop_list)
        route_sequences[route_id].add(sequence)

print(f"Total unique stops: {len(stops)}")
print(f"Total routes: {len(routes)}")
for route_id, seqs in route_sequences.items():
    print(f"Route {route_id} has {len(seqs)} unique stop sequences.")
    # Show one sequence
    if seqs:
        example_seq = list(seqs)[0]
        print(f"  Example sequence length: {len(example_seq)}")
        print(f"  Example sequence: {[stops[sid]['name'] for sid in example_seq[:5]]} ... {[stops[sid]['name'] for sid in example_seq[-5:]]}")
