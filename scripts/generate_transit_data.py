import csv
from collections import defaultdict
import math
import os

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

special_cases = {
    "kl": "KL",
    "mrt": "MRT",
    "lrt": "LRT",
    "brt": "BRT",
    "usj": "USJ",
    "upm": "UPM",
    "pwtc": "PWTC",
    "iium": "IIUM",
    "ss": "SS",
    "trx": "TRX",
    "hkl": "HKL",
    "uitm": "UiTM",
    "ioi": "IOI",
    "klcc": "KLCC",
    "sunmed": "SunMed",
    "sunu-monash": "SunU-Monash",
}

def format_word(word):
    clean_full_word = "".join(c for c in word if c.isalnum() or c == '-').lower()
    if clean_full_word in special_cases:
        return special_cases[clean_full_word]
        
    if "-" in word:
        return "-".join(format_word(part) for part in word.split("-"))
        
    clean_word = "".join(c for c in word if c.isalnum()).lower()
    if clean_word in special_cases:
        return special_cases[clean_word]
        
    if "'" in word:
        parts = word.split("'")
        return "'".join(p.capitalize() for p in parts)
        
    return word.capitalize()

def to_title_case(name):
    words = name.strip().split()
    return " ".join(format_word(w) for w in words)

mapping = {
    'BANK RAKYAT BANGSAR': 'BANGSAR',
    'CGC GLENMARIE': 'GLENMARIE',
    'KL SENTRAL - REDONE': 'KL SENTRAL',
    'BANDARAYA - UOB': 'BANDARAYA',
    'KAMPUNG BARU - CBP COOPBANK PERTAMA': 'KAMPUNG BARU',
    'KENTOMEN': 'KENTONMEN',
    'KINRARA': 'KINRARA BK5',
    'TAMAN TUN DR ISMAIL': 'TTDI',
    'SS 15': 'SS15',
    'SS 18': 'SS18',
    'USJ7': 'USJ 7',
}

def normalize_name(name):
    name_upper = name.strip().upper()
    if name_upper in mapping:
        name_upper = mapping[name_upper]
    return to_title_case(name_upper)

# Ensure script runs even if CWD is the repo root
gtfs_dir = 'scratch/extracted'
if not os.path.exists(gtfs_dir):
    raise FileNotFoundError(f"GTFS directory not found at {gtfs_dir}. Make sure you unzipped it.")

# 1. Load stops
stops = {}
with open(os.path.join(gtfs_dir, 'stops.txt'), mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        stops[row['stop_id']] = {
            'id': row['stop_id'],
            'name': normalize_name(row['stop_name']),
            'lat': float(row['stop_lat']),
            'lon': float(row['stop_lon']),
        }

# 2. Load routes
routes = {}
with open(os.path.join(gtfs_dir, 'routes.txt'), mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        routes[row['route_id']] = {
            'id': row['route_id'],
            'short_name': row['route_short_name'],
            'long_name': row['route_long_name'],
            'color': row['route_color'],
        }

# 3. Load trips
trip_routes = {}
trip_directions = {}
with open(os.path.join(gtfs_dir, 'trips.txt'), mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        trip_routes[row['trip_id']] = row['route_id']
        trip_directions[row['trip_id']] = int(row['direction_id'])

# 4. Load stop times
trip_stops = defaultdict(list)
with open(os.path.join(gtfs_dir, 'stop_times.txt'), mode='r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        trip_stops[row['trip_id']].append((int(row['stop_sequence']), row['stop_id']))

# Reconstruct canonical sequences for each route in its forward direction
route_forward_direction = {
    'KJ': 1,
    'AG': 1,
    'PH': 1,
    'KGL': 0,
    'PYL': 0,
    'MR': 0,
    'BRT': 0
}

route_sequences = {}
for trip_id, stop_list in trip_stops.items():
    route_id = trip_routes.get(trip_id)
    direction_id = trip_directions.get(trip_id)
    if route_id and direction_id == route_forward_direction.get(route_id):
        stop_list.sort()
        seq = tuple(stop_id for _, stop_id in stop_list)
        if route_id not in route_sequences or len(seq) > len(route_sequences[route_id]):
            route_sequences[route_id] = seq

# Map GTFS route IDs to variable names and app prefixes
route_mapping = {
    'KJ': ('KJ_Line', 'KJ'),
    'AG': ('AG_Line', 'AG'),
    'PH': ('SP_Line', 'SP'),
    'KGL': ('KG_Line', 'KG'),
    'PYL': ('PY_Line', 'PY'),
    'MR': ('MR_Line', 'MR'),
    'BRT': ('BRT_Line', 'BRT')
}

generated_lines_code = []

for gtfs_id, (var_name, line_prefix) in route_mapping.items():
    seq = route_sequences.get(gtfs_id)
    if not seq:
        print(f"Warning: No sequence found for route {gtfs_id}")
        continue
        
    line_stations = []
    for i, stop_id in enumerate(seq):
        stop = stops[stop_id]
        
        # Calculate distance from the previous stop
        if i == 0:
            dist = 0.0
        else:
            prev_stop = stops[seq[i-1]]
            dist = haversine(prev_stop['lat'], prev_stop['lon'], stop['lat'], stop['lon'])
            dist = round(dist, 2)
            
        code = stop_id
        if code.startswith('BRT'):
            code = code.replace('BRT', 'SB')
            
        line_stations.append({
            'code': code,
            'name': stop['name'],
            'distance': dist
        })
        
    # Generate JS array string representation
    js_station_objects = []
    for s in line_stations:
        js_station_objects.append(f'        {{ code: "{s["code"]}", name: "{s["name"]}", distance: {s["distance"]} }}')
        
    js_array = f"    const {var_name} = [\n" + ",\n".join(js_station_objects) + "\n    ];"
    generated_lines_code.append(js_array)

all_lines_code = "\n\n".join(generated_lines_code)

manual_sa_line = """    const SA_Line = [
        { code: "SA01", name: "Bandar Utama" },
        { code: "SA02", name: "Kayu Ara" },
        { code: "SA03", name: "BU 11" },
        { code: "SA05", name: "Damansara Idaman" },
        { code: "SA06", name: "Subang" },
        { code: "SA07", name: "Glenmarie 2" },
        { code: "SA09", name: "Kerjaya" },
        { code: "SA10", name: "Stadium Shah Alam" },
        { code: "SA12", name: "Dato' Menteri" },
        { code: "SA14", name: "UiTM Shah Alam" },
        { code: "SA15", name: "Seksyen 7 Shah Alam" },
        { code: "SA17", name: "Bandar Baru Klang" },
        { code: "SA18", name: "Pasar Klang" },
        { code: "SA19", name: "Jalan Meru" },
        { code: "SA20", name: "Jambatan Kota" },
        { code: "SA21", name: "Hospital Tengku Ampuan Rahimah" },
        { code: "SA22", name: "Seri Andalas" },
        { code: "SA23", name: "Klang Jaya" },
        { code: "SA24", name: "Bandar Bukit Tinggi" },
        { code: "SA26", name: "Johan Setia" }
    ];"""

manual_transfers = """    const explicitTransfers = [
        { from: "Muzium Negara", to: "KL Sentral", line: "WALKWAY", distance: 1.0 },
        { from: "Bukit Nanas", to: "Dang Wangi", line: "WALKWAY", distance: 1.2 },
        { from: "Plaza Rakyat", to: "Merdeka", line: "WALKWAY", distance: 0.8 },
        { from: "Medan Tuanku", to: "Sultan Ismail", line: "WALKWAY", distance: 0.6 },
        { from: "Glenmarie 2", to: "Glenmarie", line: "WALKWAY", distance: 0.5 }
    ];"""

output_content = f"""// Klang Valley Rail Network Data and Graph Builder (Auto-generated from GTFS Static data)
(function(global) {{
    // 1. Definition of Rail Lines
    const lines = {{
        "KJ": {{ id: "KJ", name: "LRT Kelana Jaya Line", color: "#ff2e48" }},
        "AG": {{ id: "AG", name: "LRT Ampang Line", color: "#ff8d26" }},
        "SP": {{ id: "SP", name: "LRT Sri Petaling Line", color: "#8d170a" }},
        "KG": {{ id: "KG", name: "MRT Kajang Line", color: "#1f8f4c" }},
        "PY": {{ id: "PY", name: "MRT Putrajaya Line", color: "#ffce36" }},
        "MR": {{ id: "MR", name: "KL Monorail Line", color: "#88c946" }},
        "BRT": {{ id: "BRT", name: "BRT Sunway Line", color: "#00422b" }},
        "SA": {{ id: "SA", name: "LRT Shah Alam Line", color: "#01abe4" }}
    }};

    // 2. Generated Line Stations Sequence
{all_lines_code}

    // Manual additions
{manual_sa_line}

{manual_transfers}

    // 3. Compile Graph Programmatically
    function buildGraph() {{
        const stations = {{}};

        // Helper to add or merge stations
        function registerStation(station, lineId) {{
            const normalizedName = station.name.trim();
            if (!stations[normalizedName]) {{
                stations[normalizedName] = {{
                    name: normalizedName,
                    codes: [],
                    lines: [],
                    connections: []
                }};
            }}
            const s = stations[normalizedName];
            
            // Split joint codes like "AG11/SP11" into individual codes
            const individualCodes = station.code.includes('/') ? station.code.split('/') : [station.code];
            
            individualCodes.forEach(code => {{
                const trimmedCode = code.trim();
                if (!s.codes.includes(trimmedCode)) {{
                    s.codes.push(trimmedCode);
                }}
            }});

            if (!s.lines.includes(lineId)) {{
                s.lines.push(lineId);
            }}
        }}

        // Helper to connect adjacent stations
        function connectStations(seq, lineId) {{
            for (let i = 0; i < seq.length - 1; i++) {{
                const s1 = seq[i].name.trim();
                const s2 = seq[i+1].name.trim();
                const dist = seq[i+1].distance || 1.2;
                
                // Add connections bidirectionally
                addConnection(s1, s2, lineId, dist);
            }}
        }}

        function addConnection(name1, name2, lineId, dist) {{
            const node1 = stations[name1];
            const node2 = stations[name2];
            
            if (node1 && node2) {{
                // Connect 1 -> 2
                if (!node1.connections.some(c => c.to === name2 && c.line === lineId)) {{
                    node1.connections.push({{ to: name2, line: lineId, distance: dist }});
                }}
                // Connect 2 -> 1
                if (!node2.connections.some(c => c.to === name1 && c.line === lineId)) {{
                    node2.connections.push({{ to: name1, line: lineId, distance: dist }});
                }}
            }}
        }}

        // Parse and register all stations
        KJ_Line.forEach(s => registerStation(s, "KJ"));
        AG_Line.forEach(s => registerStation(s, "AG"));
        SP_Line.forEach(s => registerStation(s, "SP"));
        KG_Line.forEach(s => registerStation(s, "KG"));
        PY_Line.forEach(s => registerStation(s, "PY"));
        MR_Line.forEach(s => registerStation(s, "MR"));
        BRT_Line.forEach(s => registerStation(s, "BRT"));
        SA_Line.forEach(s => registerStation(s, "SA"));

        // Create adjacencies on lines
        connectStations(KJ_Line, "KJ");
        connectStations(AG_Line, "AG");
        connectStations(SP_Line, "SP");
        connectStations(KG_Line, "KG");
        connectStations(PY_Line, "PY");
        connectStations(MR_Line, "MR");
        connectStations(BRT_Line, "BRT");
        connectStations(SA_Line, "SA");

        // Apply explicit pedestrian walkways
        explicitTransfers.forEach(t => {{
            addConnection(t.from, t.to, t.line, t.distance);
            // Append line lists
            const nodeFrom = stations[t.from];
            const nodeTo = stations[t.to];
            if (nodeFrom && !nodeFrom.lines.includes("WALKWAY")) nodeFrom.lines.push("WALKWAY");
            if (nodeTo && !nodeTo.lines.includes("WALKWAY")) nodeTo.lines.push("WALKWAY");
        }});

        return stations;
    }}

    // Cashless fare calculator based on official RapidKL cumulative distances, optimized for geodesic distance sums:
    // Parameters: base = 0.64, r1 = 0.35, r2 = 0.05, r3 = 0.27, r4 = 0.06, r5 = 0.02
    // Thresholds: t1 = 4.0, t2 = 9.0, t3 = 14.0, t4 = 24.0
    function calculateCashlessFare(totalKm) {{
        if (totalKm <= 0) return 0;
        let fare = 0.64; // flag fall / base fare
        if (totalKm <= 4.0) {{
            fare += totalKm * 0.35;
        }} else if (totalKm <= 9.0) {{
            fare += 4.0 * 0.35 + (totalKm - 4.0) * 0.05;
        }} else if (totalKm <= 14.0) {{
            fare += 4.0 * 0.35 + 5.0 * 0.05 + (totalKm - 9.0) * 0.27;
        }} else if (totalKm <= 24.0) {{
            fare += 4.0 * 0.35 + 5.0 * 0.05 + 5.0 * 0.27 + (totalKm - 14.0) * 0.06;
        }} else {{
            fare += 4.0 * 0.35 + 5.0 * 0.05 + 5.0 * 0.27 + 10.0 * 0.06 + (totalKm - 24.0) * 0.02;
        }}
        // Round to nearest 10 cents for standard Touch 'n Go rail rates
        return Math.ceil(fare * 10) / 10;
    }}

    // Dijkstra shortest pathfinder with transfer penalty optimization
    function findRoute(originName, destinationName, excludedLines = []) {{
        const stationsMap = buildGraph(); // Fresh copy of the graph
        
        if (!stationsMap[originName] || !stationsMap[destinationName]) {{
            return null;
        }}
        
        // Priority queue simulation
        const queue = [];
        const visited = {{}}; // key: nodeName + "_" + lastLine, value: minWeight
        
        queue.push({{
            node: originName,
            dist: 0,
            actualDist: 0,
            path: [originName],
            edges: [],
            transfers: 0,
            lastLine: null
        }});
        
        let bestResult = null;
        
        while (queue.length > 0) {{
            // Sort queue by cumulative weight
            queue.sort((a, b) => a.dist - b.dist);
            const curr = queue.shift();
            
            if (curr.node === destinationName) {{
                if (!bestResult || curr.dist < bestResult.dist) {{
                    bestResult = curr;
                }}
                break;
            }}
            
            const visitKey = curr.node + "_" + (curr.lastLine || "");
            if (visited[visitKey] !== undefined && visited[visitKey] <= curr.dist) {{
                continue;
            }}
            visited[visitKey] = curr.dist;
            
            const node = stationsMap[curr.node];
            if (!node) continue;
            
            for (const conn of node.connections) {{
                // Filter out connections belonging to excluded lines
                if (excludedLines.includes(conn.line)) {{
                    continue;
                }}
                
                const edgeDist = conn.distance;
                let weight = edgeDist;
                let isTransfer = false;
                
                // Add penalty to discourage unnecessary line changes
                if (curr.lastLine && curr.lastLine !== conn.line && conn.line !== "WALKWAY") {{
                    weight += 3.0; // transfer penalty
                    isTransfer = true;
                }}
                
                if (conn.line === "WALKWAY") {{
                    weight += 2.0; // walkway penalty
                    isTransfer = true;
                }}
                
                const nextTransfers = curr.transfers + (isTransfer ? 1 : 0);
                
                queue.push({{
                    node: conn.to,
                    dist: curr.dist + weight,
                    actualDist: curr.actualDist + edgeDist,
                    path: [...curr.path, conn.to],
                    edges: [...curr.edges, {{ from: curr.node, to: conn.to, line: conn.line, distance: edgeDist }}],
                    transfers: nextTransfers,
                    lastLine: conn.line
                }});
            }}
        }}
        
        if (bestResult) {{
            return {{
                path: bestResult.path,
                edges: bestResult.edges,
                totalDistance: bestResult.actualDist,
                totalFare: calculateCashlessFare(bestResult.actualDist),
                transfers: bestResult.transfers
            }};
        }}
        return null;
    }}

    // Export graph resources
    const transitData = {{
        lines: lines,
        stations: buildGraph(),
        calculateCashlessFare: calculateCashlessFare,
        findRoute: findRoute
    }};

    if (typeof module !== 'undefined' && module.exports) {{
        module.exports = transitData;
    }} else {{
        global.transitData = transitData;
    }}
}})(this);
"""

os.makedirs('js', exist_ok=True)
with open('js/transit-data.js', mode='w', encoding='utf-8') as out:
    out.write(output_content)

print("Successfully generated js/transit-data.js from GTFS Static data!")
