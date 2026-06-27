import csv
from collections import defaultdict

stops = {}
with open('scratch/extracted/stops.txt', mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        stops[row['stop_id']] = row['stop_name']

trip_info = {}
with open('scratch/extracted/trips.txt', mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        trip_info[row['trip_id']] = {
            'route_id': row['route_id'],
            'direction_id': row['direction_id']
        }

trip_stops = defaultdict(list)
with open('scratch/extracted/stop_times.txt', mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        trip_stops[row['trip_id']].append((int(row['stop_sequence']), row['stop_id']))

# Reconstruct unique sequences per route per direction
sequences = defaultdict(lambda: defaultdict(set))
for trip_id, stop_list in trip_stops.items():
    info = trip_info.get(trip_id)
    if info:
        stop_list.sort()
        seq = tuple(stop_id for _, stop_id in stop_list)
        sequences[info['route_id']][info['direction_id']].add(seq)

for route_id, dirs in sequences.items():
    print(f"Route {route_id}:")
    for dir_id, seqs in dirs.items():
        print(f"  Direction {dir_id}: {len(seqs)} unique sequences")
        longest = max(seqs, key=len)
        print(f"    Longest seq length: {len(longest)}")
        print(f"    Longest seq: {[stops[sid] for sid in longest[:3]]} ... {[stops[sid] for sid in longest[-3:]]}")
