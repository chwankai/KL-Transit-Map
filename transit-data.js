// Klang Valley Rail Network Data and Graph Builder
(function(global) {
    // 1. Definition of Rail Lines
    const lines = {
        "KJ": { id: "KJ", name: "LRT Kelana Jaya Line", color: "#ff2e48" },
        "AG": { id: "AG", name: "LRT Ampang Line", color: "#ff8d26" },
        "SP": { id: "SP", name: "LRT Sri Petaling Line", color: "#8d170a" },
        "KG": { id: "KG", name: "MRT Kajang Line", color: "#1f8f4c" },
        "PY": { id: "PY", name: "MRT Putrajaya Line", color: "#ffce36" },
        "MR": { id: "MR", name: "KL Monorail Line", color: "#88c946" },
        "BRT": { id: "BRT", name: "BRT Sunway Line", color: "#00422b" },
        "SA": { id: "SA", name: "LRT Shah Alam Line", color: "#01abe4" }
    };

    // 2. Raw Line Stations Sequence
    const KJ_Line = [
        { code: "KJ1", name: "Gombak" },
        { code: "KJ2", name: "Taman Melati" },
        { code: "KJ3", name: "Wangsa Maju" },
        { code: "KJ4", name: "Sri Rampai" },
        { code: "KJ5", name: "Setiawangsa" },
        { code: "KJ6", name: "Jelatek" },
        { code: "KJ7", name: "Dato' Keramat" },
        { code: "KJ8", name: "Damai" },
        { code: "KJ9", name: "Ampang Park" },
        { code: "KJ10", name: "KLCC" },
        { code: "KJ11", name: "Kampung Baru" },
        { code: "KJ12", name: "Dang Wangi" },
        { code: "KJ13", name: "Masjid Jamek" },
        { code: "KJ14", name: "Pasar Seni" },
        { code: "KJ15", name: "KL Sentral" },
        { code: "KJ16", name: "Bangsar" },
        { code: "KJ17", name: "Abdullah Hukum" },
        { code: "KJ18", name: "Kerinchi" },
        { code: "KJ19", name: "Universiti" },
        { code: "KJ20", name: "Taman Jaya" },
        { code: "KJ21", name: "Asia Jaya" },
        { code: "KJ22", name: "Taman Paramount" },
        { code: "KJ23", name: "Taman Bahagia" },
        { code: "KJ24", name: "Kelana Jaya" },
        { code: "KJ25", name: "Lembah Subang" },
        { code: "KJ26", name: "Ara Damansara" },
        { code: "KJ27", name: "Glenmarie" },
        { code: "KJ28", name: "Subang Jaya" },
        { code: "KJ29", name: "SS15" },
        { code: "KJ30", name: "SS18" },
        { code: "KJ31", name: "USJ 7" },
        { code: "KJ32", name: "Taipan" },
        { code: "KJ33", name: "Wawasan" },
        { code: "KJ34", name: "USJ 21" },
        { code: "KJ35", name: "Alam Megah" },
        { code: "KJ36", name: "Subang Alam" },
        { code: "KJ37", name: "Putra Heights" }
    ];

    const AG_SP_Common = [
        { code: "AG1/SP1", name: "Sentul Timur" },
        { code: "AG2/SP2", name: "Sentul" },
        { code: "AG3/SP3", name: "Titiwangsa" },
        { code: "AG4/SP4", name: "PWTC" },
        { code: "AG5/SP5", name: "Sultan Ismail" },
        { code: "AG6/SP6", name: "Bandaraya" },
        { code: "AG7/SP7", name: "Masjid Jamek" },
        { code: "AG8/SP8", name: "Plaza Rakyat" },
        { code: "AG9/SP9", name: "Hang Tuah" },
        { code: "AG10/SP10", name: "Pudu" },
        { code: "AG11/SP11", name: "Chan Sow Lin" }
    ];

    const AG_Branch = [
        { code: "AG11", name: "Chan Sow Lin" },
        { code: "AG12", name: "Miharja" },
        { code: "AG13", name: "Maluri" },
        { code: "AG14", name: "Pandan Jaya" },
        { code: "AG15", name: "Pandan Indah" },
        { code: "AG16", name: "Cempaka" },
        { code: "AG17", name: "Cahaya" },
        { code: "AG18", name: "Ampang" }
    ];

    const SP_Branch = [
        { code: "SP11", name: "Chan Sow Lin" },
        { code: "SP12", name: "Cheras" },
        { code: "SP13", name: "Salak Selatan" },
        { code: "SP14", name: "Bandar Tun Razak" },
        { code: "SP15", name: "Bandar Tasik Selatan" },
        { code: "SP16", name: "Sungai Besi" },
        { code: "SP17", name: "Bukit Jalil" },
        { code: "SP18", name: "Sri Petaling" },
        { code: "SP19", name: "Awan Besar" },
        { code: "SP20", name: "Muhibbah" },
        { code: "SP21", name: "Alam Sutera" },
        { code: "SP22", name: "Kinrara BK5" },
        { code: "SP24", name: "IOI Puchong Jaya" },
        { code: "SP25", name: "Pusat Bandar Puchong" },
        { code: "SP26", name: "Taman Perindustrian Puchong" },
        { code: "SP27", name: "Bandar Puteri" },
        { code: "SP28", name: "Puchong Perdana" },
        { code: "SP29", name: "Puchong Prima" },
        { code: "SP31", name: "Putra Heights" }
    ];

    const KG_Line = [
        { code: "KG4", name: "Kwasa Damansara" },
        { code: "KG5", name: "Kwasa Sentral" },
        { code: "KG6", name: "Kota Damansara" },
        { code: "KG7", name: "Surian" },
        { code: "KG8", name: "Mutiara Damansara" },
        { code: "KG9", name: "Bandar Utama" },
        { code: "KG10", name: "TTDI" },
        { code: "KG12", name: "Phileo Damansara" },
        { code: "KG13", name: "Pusat Bandar Damansara" },
        { code: "KG14", name: "Semantan" },
        { code: "KG15", name: "Muzium Negara" },
        { code: "KG16", name: "Pasar Seni" },
        { code: "KG17", name: "Merdeka" },
        { code: "KG18", name: "Bukit Bintang" },
        { code: "KG20", name: "Tun Razak Exchange" },
        { code: "KG21", name: "Cochrane" },
        { code: "KG22", name: "Maluri" },
        { code: "KG23", name: "Taman Pertama" },
        { code: "KG24", name: "Taman Midah" },
        { code: "KG25", name: "Taman Mutiara" },
        { code: "KG26", name: "Taman Connaught" },
        { code: "KG27", name: "Taman Suntex" },
        { code: "KG28", name: "Sri Raya" },
        { code: "KG29", name: "Bandar Tun Hussein Onn" },
        { code: "KG30", name: "Batu 11 Cheras" },
        { code: "KG31", name: "Bukit Dukung" },
        { code: "KG33", name: "Sungai Jernih" },
        { code: "KG34", name: "Stadium Kajang" },
        { code: "KG35", name: "Kajang" }
    ];

    const PY_Line = [
        { code: "PY1", name: "Kwasa Damansara" },
        { code: "PY3", name: "Kampung Selamat" },
        { code: "PY4", name: "Sungai Buloh" },
        { code: "PY5", name: "Damansara Damai" },
        { code: "PY6", name: "Sri Damansara Barat" },
        { code: "PY7", name: "Sri Damansara Sentral" },
        { code: "PY8", name: "Sri Damansara Timur" },
        { code: "PY9", name: "Metro Prima" },
        { code: "PY10", name: "Kepong Baru" },
        { code: "PY11", name: "Jinjang" },
        { code: "PY12", name: "Sri Delima" },
        { code: "PY13", name: "Kampung Batu" },
        { code: "PY14", name: "Taman Wahyu" },
        { code: "PY15", name: "Jalan Ipoh" },
        { code: "PY16", name: "Sentul Barat" },
        { code: "PY17", name: "Titiwangsa" },
        { code: "PY18", name: "Hospital Kuala Lumpur" },
        { code: "PY19", name: "Raja Uda" },
        { code: "PY20", name: "Ampang Park" },
        { code: "PY21", name: "Persiaran KLCC" },
        { code: "PY22", name: "Conlay" },
        { code: "PY23", name: "Tun Razak Exchange" },
        { code: "PY24", name: "Chan Sow Lin" },
        { code: "PY27", name: "Kuchai" },
        { code: "PY28", name: "Taman Naga Emas" },
        { code: "PY29", name: "Sungai Besi" },
        { code: "PY31", name: "Serdang Raya Utara" },
        { code: "PY32", name: "Serdang Raya Selatan" },
        { code: "PY33", name: "Serdang Jaya" },
        { code: "PY34", name: "UPM" },
        { code: "PY36", name: "Taman Equine" },
        { code: "PY37", name: "Putra Permai" },
        { code: "PY38", name: "16 Sierra" },
        { code: "PY39", name: "Cyberjaya Utara" },
        { code: "PY40", name: "Cyberjaya City Centre" },
        { code: "PY41", name: "Putrajaya Sentral" }
    ];

    const MR_Line = [
        { code: "MR1", name: "KL Sentral" },
        { code: "MR2", name: "Tun Sambanthan" },
        { code: "MR3", name: "Maharajalela" },
        { code: "MR4", name: "Hang Tuah" },
        { code: "MR5", name: "Imbi" },
        { code: "MR6", name: "Bukit Bintang" },
        { code: "MR7", name: "Raja Chulan" },
        { code: "MR8", name: "Bukit Nanas" },
        { code: "MR9", name: "Medan Tuanku" },
        { code: "MR10", name: "Chow Kit" },
        { code: "MR11", name: "Titiwangsa" }
    ];

    const BRT_Line = [
        { code: "SB1", name: "Sunway-Setia Jaya" },
        { code: "SB2", name: "Mentari" },
        { code: "SB3", name: "Sunway Lagoon" },
        { code: "SB4", name: "SunMed" },
        { code: "SB5", name: "SunU-Monash" },
        { code: "SB6", name: "South Quay-USJ 1" },
        { code: "SB7", name: "USJ 7" }
    ];

    const SA_Line = [
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
    ];

    // Explicit pedestrian interchange bridges between differently named stations
    const explicitTransfers = [
        { from: "Muzium Negara", to: "KL Sentral", line: "WALKWAY", distance: 1.0 },
        { from: "Bukit Nanas", to: "Dang Wangi", line: "WALKWAY", distance: 1.2 },
        { from: "Plaza Rakyat", to: "Merdeka", line: "WALKWAY", distance: 0.8 },
        { from: "Medan Tuanku", to: "Sultan Ismail", line: "WALKWAY", distance: 0.6 },
        { from: "Glenmarie 2", to: "Glenmarie", line: "WALKWAY", distance: 0.5 }
    ];

    // 3. Compile Graph Programmatically
    function buildGraph() {
        const stations = {};

        // Helper to add or merge stations
        function registerStation(station, lineId) {
            const normalizedName = station.name.trim();
            if (!stations[normalizedName]) {
                stations[normalizedName] = {
                    name: normalizedName,
                    codes: [],
                    lines: [],
                    connections: []
                };
            }
            const s = stations[normalizedName];
            
            // Split joint codes like "AG11/SP11" into individual codes ["AG11", "SP11"]
            const individualCodes = station.code.includes('/') ? station.code.split('/') : [station.code];
            
            individualCodes.forEach(code => {
                const trimmedCode = code.trim();
                if (!s.codes.includes(trimmedCode)) {
                    s.codes.push(trimmedCode);
                }
            });

            if (!s.lines.includes(lineId)) {
                s.lines.push(lineId);
            }
        }

        // Helper to connect adjacent stations
        function connectStations(seq, lineId) {
            for (let i = 0; i < seq.length - 1; i++) {
                const s1 = seq[i].name.trim();
                const s2 = seq[i+1].name.trim();
                
                // Add connections bidirectionally
                addConnection(s1, s2, lineId, 1.2); // approx 1.2km/station average
            }
        }

        function addConnection(name1, name2, lineId, dist) {
            const node1 = stations[name1];
            const node2 = stations[name2];
            
            if (node1 && node2) {
                // Connect 1 -> 2
                if (!node1.connections.some(c => c.to === name2 && c.line === lineId)) {
                    node1.connections.push({ to: name2, line: lineId, distance: dist });
                }
                // Connect 2 -> 1
                if (!node2.connections.some(c => c.to === name1 && c.line === lineId)) {
                    node2.connections.push({ to: name1, line: lineId, distance: dist });
                }
            }
        }

        // Parse and register all stations
        KJ_Line.forEach(s => registerStation(s, "KJ"));
        AG_SP_Common.forEach(s => {
            registerStation(s, "AG");
            registerStation(s, "SP");
        });
        AG_Branch.forEach(s => registerStation(s, "AG"));
        SP_Branch.forEach(s => registerStation(s, "SP"));
        KG_Line.forEach(s => registerStation(s, "KG"));
        PY_Line.forEach(s => registerStation(s, "PY"));
        MR_Line.forEach(s => registerStation(s, "MR"));
        BRT_Line.forEach(s => registerStation(s, "BRT"));
        SA_Line.forEach(s => registerStation(s, "SA"));

        // Create adjacencies on lines
        connectStations(KJ_Line, "KJ");
        connectStations(AG_SP_Common, "AG");
        connectStations(AG_SP_Common, "SP");
        connectStations(AG_Branch, "AG");
        connectStations(SP_Branch, "SP");
        connectStations(KG_Line, "KG");
        connectStations(PY_Line, "PY");
        connectStations(MR_Line, "MR");
        connectStations(BRT_Line, "BRT");
        connectStations(SA_Line, "SA");

        // Apply explicit pedestrian walkways
        explicitTransfers.forEach(t => {
            addConnection(t.from, t.to, t.line, t.distance);
            // Append line lists
            const nodeFrom = stations[t.from];
            const nodeTo = stations[t.to];
            if (nodeFrom && !nodeFrom.lines.includes("WALKWAY")) nodeFrom.lines.push("WALKWAY");
            if (nodeTo && !nodeTo.lines.includes("WALKWAY")) nodeTo.lines.push("WALKWAY");
        });

        return stations;
    }

    // Cashless fare calculator based on official RapidKL cumulative distances:
    // Rates:
    // 0.0 to 4.0 km = Base RM 0.80 + RM 0.180 per km
    // 4.1 to 9.0 km = Base RM 1.10 + RM 0.160 per km (for distance beyond 4km)
    // 9.1 to 14.0 km = Base RM 1.50 + RM 0.120 per km (for distance beyond 9km)
    // 14.1 to 19.0 km = Base RM 1.90 + RM 0.080 per km (for distance beyond 14km)
    // 19.1 to 24.0 km = Base RM 2.20 + RM 0.060 per km (for distance beyond 19km)
    // 24.1 km+ = Base RM 2.50 + RM 0.050 per km (for distance beyond 24km)
    function calculateCashlessFare(totalKm) {
        if (totalKm <= 0) return 0;
        let fare = 0;
        if (totalKm <= 4.0) {
            fare = 0.80 + (totalKm * 0.180);
        } else if (totalKm <= 9.0) {
            fare = 1.10 + ((totalKm - 4.0) * 0.160);
        } else if (totalKm <= 14.0) {
            fare = 1.50 + ((totalKm - 9.0) * 0.120);
        } else if (totalKm <= 19.0) {
            fare = 1.90 + ((totalKm - 14.0) * 0.080);
        } else if (totalKm <= 24.0) {
            fare = 2.20 + ((totalKm - 19.0) * 0.060);
        } else {
            fare = 2.50 + ((totalKm - 24.0) * 0.050);
        }
        // Round to nearest 10 cents for standard Touch 'n Go rail rates
        return Math.ceil(fare * 10) / 10;
    }

    // Dijkstra shortest pathfinder with transfer penalty optimization
    function findRoute(originName, destinationName, excludedLines = []) {
        const stationsMap = buildGraph(); // Fresh copy of the graph
        
        if (!stationsMap[originName] || !stationsMap[destinationName]) {
            return null;
        }
        
        // Priority queue simulation
        const queue = [];
        const visited = {}; // key: nodeName + "_" + lastLine, value: minWeight
        
        queue.push({
            node: originName,
            dist: 0,
            actualDist: 0,
            path: [originName],
            edges: [],
            transfers: 0,
            lastLine: null
        });
        
        let bestResult = null;
        
        while (queue.length > 0) {
            // Sort queue by cumulative weight
            queue.sort((a, b) => a.dist - b.dist);
            const curr = queue.shift();
            
            if (curr.node === destinationName) {
                if (!bestResult || curr.dist < bestResult.dist) {
                    bestResult = curr;
                }
                break;
            }
            
            const visitKey = curr.node + "_" + (curr.lastLine || "");
            if (visited[visitKey] !== undefined && visited[visitKey] <= curr.dist) {
                continue;
            }
            visited[visitKey] = curr.dist;
            
            const node = stationsMap[curr.node];
            if (!node) continue;
            
            for (const conn of node.connections) {
                // Filter out connections belonging to excluded lines
                if (excludedLines.includes(conn.line)) {
                    continue;
                }
                
                const edgeDist = conn.distance;
                let weight = edgeDist;
                let isTransfer = false;
                
                // Add penalty to discourage unnecessary line changes
                if (curr.lastLine && curr.lastLine !== conn.line && conn.line !== "WALKWAY") {
                    weight += 3.0; // transfer penalty
                    isTransfer = true;
                }
                
                if (conn.line === "WALKWAY") {
                    weight += 2.0; // walkway penalty
                    isTransfer = true;
                }
                
                const nextTransfers = curr.transfers + (isTransfer ? 1 : 0);
                
                queue.push({
                    node: conn.to,
                    dist: curr.dist + weight,
                    actualDist: curr.actualDist + edgeDist,
                    path: [...curr.path, conn.to],
                    edges: [...curr.edges, { from: curr.node, to: conn.to, line: conn.line, distance: edgeDist }],
                    transfers: nextTransfers,
                    lastLine: conn.line
                });
            }
        }
        
        if (bestResult) {
            return {
                path: bestResult.path,
                edges: bestResult.edges,
                totalDistance: bestResult.actualDist,
                totalFare: calculateCashlessFare(bestResult.actualDist),
                transfers: bestResult.transfers
            };
        }
        return null;
    }

    // Export graph resources
    const transitData = {
        lines: lines,
        stations: buildGraph(),
        calculateCashlessFare: calculateCashlessFare,
        findRoute: findRoute
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = transitData;
    } else {
        global.transitData = transitData;
    }
})(this);
