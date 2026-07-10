export interface Line {
  id: string;
  name: string;
  color: string;
  length?: string;
  ridership?: string;
  hours?: string;
}

export interface Connection {
  to: string;
  line: string;
  distance: number;
}

export interface StationObj {
  name: string;
  codes: string[];
  lines: string[];
  connections: Connection[];
}

export interface Edge {
  from: string;
  to: string;
  line: string;
  distance: number;
}

export interface Route {
  path: string[];
  edges: Edge[];
  totalDistance: number;
  totalFare: number;
  cashFare?: number | null;
  concessionFare?: number | null;
  transfers: number;
  isSameStation?: boolean;
  etaDepart?: string | null;
  etaArrive?: string | null;
  totalDurationSec?: number | null;
  legMeta?: any[];
  _routeLabel?: string;
  _routeType?: string;
}

export const lines: Record<string, Line> = {
  "KJ": { id: "KJ", name: "LRT Kelana Jaya Line", color: "#ff2e48", length: "46.4 km", ridership: "286,000", hours: "06:00 - 00:00" },
  "AG": { id: "AG", name: "LRT Ampang Line", color: "#ff8d26", length: "18.0 km", ridership: "112,000", hours: "06:00 - 00:00" },
  "SP": { id: "SP", name: "LRT Sri Petaling Line", color: "#8d170a", length: "37.0 km", ridership: "112,000", hours: "06:00 - 00:00" },
  "KG": { id: "KG", name: "MRT Kajang Line", color: "#1f8f4c", length: "47.0 km", ridership: "287,000", hours: "06:00 - 00:00" },
  "PY": { id: "PY", name: "MRT Putrajaya Line", color: "#ffce36", length: "57.7 km", ridership: "183,000", hours: "06:00 - 00:00" },
  "MR": { id: "MR", name: "KL Monorail Line", color: "#88c946", length: "8.6 km", ridership: "56,000", hours: "06:00 - 00:00" },
  "BRT": { id: "BRT", name: "BRT Sunway Line", color: "#00422b", length: "5.4 km", ridership: "21,700", hours: "06:00 - 00:00" },
  "SA": { id: "SA", name: "LRT Shah Alam Line", color: "#01abe4", length: "37.8 km", ridership: "67,000 (target)", hours: "06:00 - 00:00" }
};

const KJ_Line = [
  { code: "KJ1", name: "Gombak", distance: 0.0 },
  { code: "KJ2", name: "Taman Melati", distance: 1.39 },
  { code: "KJ3", name: "Wangsa Maju", distance: 1.88 },
  { code: "KJ4", name: "Sri Rampai", distance: 0.97 },
  { code: "KJ5", name: "Setiawangsa", distance: 2.61 },
  { code: "KJ6", name: "Jelatek", distance: 0.95 },
  { code: "KJ7", name: "Dato' Keramat", distance: 0.45 },
  { code: "KJ8", name: "Damai", distance: 0.82 },
  { code: "KJ9", name: "Ampang Park", distance: 0.79 },
  { code: "KJ10", name: "KLCC", distance: 0.65 },
  { code: "KJ11", name: "Kampung Baru", distance: 0.79 },
  { code: "KJ12", name: "Dang Wangi", distance: 0.71 },
  { code: "KJ13", name: "Masjid Jamek", distance: 0.99 },
  { code: "KJ14", name: "Pasar Seni", distance: 0.83 },
  { code: "KJ15", name: "KL Sentral", distance: 1.34 },
  { code: "KJ16", name: "Bangsar", distance: 1.1 },
  { code: "KJ17", name: "Abdullah Hukum", distance: 1.2 },
  { code: "KJ18", name: "Kerinchi", distance: 0.6 },
  { code: "KJ19", name: "Universiti", distance: 0.78 },
  { code: "KJ20", name: "Taman Jaya", distance: 2.16 },
  { code: "KJ21", name: "Asia Jaya", distance: 0.84 },
  { code: "KJ22", name: "Taman Paramount", distance: 1.61 },
  { code: "KJ23", name: "Taman Bahagia", distance: 1.33 },
  { code: "KJ24", name: "Kelana Jaya", distance: 0.97 },
  { code: "KJ25", name: "Lembah Subang", distance: 1.47 },
  { code: "KJ26", name: "Ara Damansara", distance: 0.64 },
  { code: "KJ27", name: "Glenmarie", distance: 1.62 },
  { code: "KJ28", name: "Subang Jaya", distance: 1.15 },
  { code: "KJ29", name: "Ss15", distance: 0.99 },
  { code: "KJ30", name: "Ss18", distance: 0.98 },
  { code: "KJ31", name: "USJ 7", distance: 1.53 },
  { code: "KJ32", name: "Taipan", distance: 0.79 },
  { code: "KJ33", name: "Wawasan", distance: 1.47 },
  { code: "KJ34", name: "USJ 21", distance: 0.94 },
  { code: "KJ35", name: "Alam Megah", distance: 1.31 },
  { code: "KJ36", name: "Subang Alam", distance: 1.53 },
  { code: "KJ37", name: "Putra Heights", distance: 1.51 }
];

const AG_Line = [
  { code: "AG1", name: "Sentul Timur", distance: 0.0 },
  { code: "AG2", name: "Sentul", distance: 0.83 },
  { code: "AG3", name: "Titiwangsa", distance: 0.55 },
  { code: "AG4", name: "PWTC", distance: 0.82 },
  { code: "AG5", name: "Sultan Ismail", distance: 0.57 },
  { code: "AG6", name: "Bandaraya", distance: 0.63 },
  { code: "AG7", name: "Masjid Jamek", distance: 0.73 },
  { code: "AG8", name: "Plaza Rakyat", distance: 0.86 },
  { code: "AG9", name: "Hang Tuah", distance: 0.62 },
  { code: "AG10", name: "Pudu", distance: 0.87 },
  { code: "AG11", name: "Chan Sow Lin", distance: 0.86 },
  { code: "AG12", name: "Miharja", distance: 0.83 },
  { code: "AG13", name: "Maluri", distance: 1.07 },
  { code: "AG14", name: "Pandan Jaya", distance: 1.52 },
  { code: "AG15", name: "Pandan Indah", distance: 0.96 },
  { code: "AG16", name: "Cempaka", distance: 0.83 },
  { code: "AG17", name: "Cahaya", distance: 0.48 },
  { code: "AG18", name: "Ampang", distance: 1.15 }
];

const SP_Line = [
  { code: "SP1", name: "Sentul Timur", distance: 0.0 },
  { code: "SP2", name: "Sentul", distance: 0.83 },
  { code: "SP3", name: "Titiwangsa", distance: 0.55 },
  { code: "SP4", name: "PWTC", distance: 0.82 },
  { code: "SP5", name: "Sultan Ismail", distance: 0.57 },
  { code: "SP6", name: "Bandaraya", distance: 0.63 },
  { code: "SP7", name: "Masjid Jamek", distance: 0.73 },
  { code: "SP8", name: "Plaza Rakyat", distance: 0.86 },
  { code: "SP9", name: "Hang Tuah", distance: 0.62 },
  { code: "SP10", name: "Pudu", distance: 0.87 },
  { code: "SP11", name: "Chan Sow Lin", distance: 0.86 },
  { code: "SP12", name: "Cheras", distance: 1.73 },
  { code: "SP13", name: "Salak Selatan", distance: 1.46 },
  { code: "SP14", name: "Bandar Tun Razak", distance: 1.57 },
  { code: "SP15", name: "Bandar Tasik Selatan", distance: 1.51 },
  { code: "SP16", name: "Sungai Besi", distance: 1.4 },
  { code: "SP17", name: "Bukit Jalil", distance: 1.88 },
  { code: "SP18", name: "Sri Petaling", distance: 0.67 },
  { code: "SP19", name: "Awan Besar", distance: 1.84 },
  { code: "SP20", name: "Muhibbah", distance: 0.89 },
  { code: "SP21", name: "Alam Sutera", distance: 1.08 },
  { code: "SP22", name: "Kinrara Bk5", distance: 1.43 },
  { code: "SP24", name: "IOI Puchong Jaya", distance: 2.61 },
  { code: "SP25", name: "Pusat Bandar Puchong", distance: 1.74 },
  { code: "SP26", name: "Taman Perindustrian Puchong", distance: 1.19 },
  { code: "SP27", name: "Bandar Puteri", distance: 0.64 },
  { code: "SP28", name: "Puchong Perdana", distance: 1.34 },
  { code: "SP29", name: "Puchong Prima", distance: 1.29 },
  { code: "SP31", name: "Putra Heights", distance: 2.39 }
];

const KG_Line = [
  { code: "KG04", name: "Kwasa Damansara", distance: 0.0 },
  { code: "KG05", name: "Kwasa Sentral", distance: 1.06 },
  { code: "KG06", name: "Kota Damansara", distance: 2.71 },
  { code: "KG07", name: "Surian", distance: 1.69 },
  { code: "KG08", name: "Mutiara Damansara", distance: 1.8 },
  { code: "KG09", name: "Bandar Utama", distance: 1.42 },
  { code: "KG10", name: "TTDI", distance: 1.77 },
  { code: "KG12", name: "Phileo Damansara", distance: 1.5 },
  { code: "KG13", name: "Pusat Bandar Damansara", distance: 2.72 },
  { code: "KG14", name: "Semantan", distance: 0.89 },
  { code: "KG15", name: "Muzium Negara", distance: 2.86 },
  { code: "KG16", name: "Pasar Seni", distance: 1.07 },
  { code: "KG17", name: "Merdeka", distance: 0.72 },
  { code: "KG18A", name: "Bukit Bintang", distance: 1.11 },
  { code: "KG20", name: "Tun Razak Exchange (TRX)", distance: 1.12 },
  { code: "KG21", name: "Cochrane", distance: 1.11 },
  { code: "KG22", name: "Maluri", distance: 1.16 },
  { code: "KG23", name: "Taman Pertama", distance: 1.24 },
  { code: "KG24", name: "Taman Midah", distance: 0.95 },
  { code: "KG25", name: "Taman Mutiara", distance: 1.76 },
  { code: "KG26", name: "Taman Connaught", distance: 1.42 },
  { code: "KG27", name: "Taman Suntex", distance: 2.2 },
  { code: "KG28", name: "Sri Raya", distance: 1.47 },
  { code: "KG29", name: "Bandar Tun Hussein Onn", distance: 1.58 },
  { code: "KG30", name: "Batu 11 Cheras", distance: 0.79 },
  { code: "KG31", name: "Bukit Dukung", distance: 1.68 },
  { code: "KG33", name: "Sungai Jernih", distance: 3.17 },
  { code: "KG34", name: "Stadium Kajang", distance: 0.77 },
  { code: "KG35", name: "Kajang", distance: 1.38 }
];

const PY_Line = [
  { code: "PY01", name: "Kwasa Damansara", distance: 0.0 },
  { code: "PY03", name: "Kampung Selamat", distance: 2.43 },
  { code: "PY04", name: "Sungai Buloh", distance: 1.08 },
  { code: "PY05", name: "Damansara Damai", distance: 1.41 },
  { code: "PY06", name: "Sri Damansara Barat", distance: 1.75 },
  { code: "PY07", name: "Sri Damansara Sentral", distance: 1.46 },
  { code: "PY08", name: "Sri Damansara Timur", distance: 1.29 },
  { code: "PY09", name: "Metro Prima", distance: 1.4 },
  { code: "PY10", name: "Kepong Baru", distance: 1.02 },
  { code: "PY11", name: "Jinjang", distance: 0.88 },
  { code: "PY12", name: "Sri Delima", distance: 1.13 },
  { code: "PY13", name: "Kampung Batu", distance: 1.09 },
  { code: "PY14", name: "Kentonmen", distance: 1.2 },
  { code: "PY15", name: "Jalan Ipoh", distance: 0.72 },
  { code: "PY16", name: "Sentul Barat", distance: 1.18 },
  { code: "PY17", name: "Titiwangsa", distance: 1.36 },
  { code: "PY18", name: "Hospital Kuala Lumpur", distance: 0.73 },
  { code: "PY19", name: "Raja Uda", distance: 1.1 },
  { code: "PY20", name: "Ampang Park", distance: 1.06 },
  { code: "PY21", name: "Persiaran KLCC", distance: 0.57 },
  { code: "PY22", name: "Conlay", distance: 0.63 },
  { code: "PY23", name: "Tun Razak Exchange (TRX)", distance: 0.99 },
  { code: "PY24", name: "Chan Sow Lin", distance: 1.66 },
  { code: "PY27", name: "Kuchai", distance: 4.99 },
  { code: "PY28", name: "Taman Naga Emas", distance: 1.46 },
  { code: "PY29", name: "Sungai Besi", distance: 1.82 },
  { code: "PY31", name: "Serdang Raya Utara", distance: 2.48 },
  { code: "PY32", name: "Serdang Raya Selatan", distance: 1.5 },
  { code: "PY33", name: "Serdang Jaya", distance: 0.78 },
  { code: "PY34", name: "UPM", distance: 1.51 },
  { code: "PY36", name: "Taman Equine", distance: 4.23 },
  { code: "PY37", name: "Putra Permai", distance: 1.44 },
  { code: "PY38", name: "16 Sierra", distance: 2.16 },
  { code: "PY39", name: "Cyberjaya Utara", distance: 1.69 },
  { code: "PY40", name: "Cyberjaya City Centre", distance: 1.6 },
  { code: "PY41", name: "Putrajaya Sentral", distance: 1.0 }
];

const MR_Line = [
  { code: "MR1", name: "KL Sentral", distance: 0.0 },
  { code: "MR2", name: "Tun Sambanthan", distance: 0.38 },
  { code: "MR3", name: "Maharajalela", distance: 1.25 },
  { code: "MR4", name: "Hang Tuah", distance: 0.78 },
  { code: "MR5", name: "Imbi", distance: 0.46 },
  { code: "MR6", name: "Bukit Bintang", distance: 0.42 },
  { code: "MR7", name: "Raja Chulan", distance: 0.55 },
  { code: "MR8", name: "Bukit Nanas", distance: 0.86 },
  { code: "MR9", name: "Medan Tuanku", distance: 0.74 },
  { code: "MR10", name: "Chow Kit", distance: 0.89 },
  { code: "MR11", name: "Titiwangsa", distance: 0.7 }
];

const BRT_Line = [
  { code: "SB1", name: "Sunway-Setia Jaya", distance: 0.0 },
  { code: "SB2", name: "Mentari", distance: 0.78 },
  { code: "SB3", name: "Sunway Lagoon", distance: 0.62 },
  { code: "SB4", name: "SunMed", distance: 0.6 },
  { code: "SB5", name: "SunU-Monash", distance: 0.79 },
  { code: "SB6", name: "South Quay-USJ 1", distance: 0.66 },
  { code: "SB7", name: "USJ 7", distance: 0.9 }
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
  { code: "SA21", name: "Taman Selatan" },
  { code: "SA22", name: "Seri Andalas" },
  { code: "SA23", name: "Klang Jaya" },
  { code: "SA24", name: "Bandar Bukit Tinggi" },
  { code: "SA26", name: "Johan Setia" }
];

const explicitTransfers = [
  { from: "Muzium Negara", to: "KL Sentral", line: "WALKWAY", distance: 1.0 },
  { from: "Bukit Nanas", to: "Dang Wangi", line: "WALKWAY", distance: 1.2 },
  { from: "Plaza Rakyat", to: "Merdeka", line: "WALKWAY", distance: 0.8 },
  { from: "Medan Tuanku", to: "Sultan Ismail", line: "WALKWAY", distance: 0.6 },
  { from: "Glenmarie 2", to: "Glenmarie", line: "WALKWAY", distance: 0.5 }
];

function buildGraph(): Record<string, StationObj> {
  const stations: Record<string, StationObj> = {};

  function registerStation(station: { code: string; name: string }, lineId: string) {
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

  function connectStations(seq: { name: string; distance?: number }[], lineId: string) {
    for (let i = 0; i < seq.length - 1; i++) {
      const s1 = seq[i].name.trim();
      const s2 = seq[i+1].name.trim();
      const dist = seq[i+1].distance || 1.2;
      addConnection(s1, s2, lineId, dist);
    }
  }

  function addConnection(name1: string, name2: string, lineId: string, dist: number) {
    const node1 = stations[name1];
    const node2 = stations[name2];
    
    if (node1 && node2) {
      if (!node1.connections.some(c => c.to === name2 && c.line === lineId)) {
        node1.connections.push({ to: name2, line: lineId, distance: dist });
      }
      if (!node2.connections.some(c => c.to === name1 && c.line === lineId)) {
        node2.connections.push({ to: name1, line: lineId, distance: dist });
      }
    }
  }

  KJ_Line.forEach(s => registerStation(s, "KJ"));
  AG_Line.forEach(s => registerStation(s, "AG"));
  SP_Line.forEach(s => registerStation(s, "SP"));
  KG_Line.forEach(s => registerStation(s, "KG"));
  PY_Line.forEach(s => registerStation(s, "PY"));
  MR_Line.forEach(s => registerStation(s, "MR"));
  BRT_Line.forEach(s => registerStation(s, "BRT"));
  SA_Line.forEach(s => registerStation(s, "SA"));

  connectStations(KJ_Line, "KJ");
  connectStations(AG_Line, "AG");
  connectStations(SP_Line, "SP");
  connectStations(KG_Line, "KG");
  connectStations(PY_Line, "PY");
  connectStations(MR_Line, "MR");
  connectStations(BRT_Line, "BRT");
  connectStations(SA_Line, "SA");

  explicitTransfers.forEach(t => {
    addConnection(t.from, t.to, t.line, t.distance);
    const nodeFrom = stations[t.from];
    const nodeTo = stations[t.to];
    if (nodeFrom && !nodeFrom.lines.includes("WALKWAY")) nodeFrom.lines.push("WALKWAY");
    if (nodeTo && !nodeTo.lines.includes("WALKWAY")) nodeTo.lines.push("WALKWAY");
  });

  // Add non-enumerable aliases for backward compatibility/local storage migrations
  if (stations["Tun Razak Exchange (TRX)"]) {
    Object.defineProperty(stations, "Tun Razak Exchange", {
      value: stations["Tun Razak Exchange (TRX)"],
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
  if (stations["Jambatan Kota"]) {
    Object.defineProperty(stations, "Pasar Jawa", {
      value: stations["Jambatan Kota"],
      writable: true,
      enumerable: false,
      configurable: true
    });
  }

  return stations;
}

export const stations = buildGraph();

export function calculateCashlessFare(totalKm: number): number {
  if (totalKm <= 0) return 0;
  let fare = 0.64;
  if (totalKm <= 4.0) {
    fare += totalKm * 0.35;
  } else if (totalKm <= 9.0) {
    fare += 4.0 * 0.35 + (totalKm - 4.0) * 0.05;
  } else if (totalKm <= 14.0) {
    fare += 4.0 * 0.35 + 5.0 * 0.05 + (totalKm - 9.0) * 0.27;
  } else if (totalKm <= 24.0) {
    fare += 4.0 * 0.35 + 5.0 * 0.05 + 5.0 * 0.27 + (totalKm - 14.0) * 0.06;
  } else {
    fare += 4.0 * 0.35 + 5.0 * 0.05 + 5.0 * 0.27 + 10.0 * 0.06 + (totalKm - 24.0) * 0.02;
  }
  return Math.ceil(fare * 10) / 10;
}

export function findRoute(originName: string, destinationName: string, excludedLines: string[] = []): Route | null {
  const stationsMap = stations;
  
  if (!stationsMap[originName] || !stationsMap[destinationName]) {
    return null;
  }
  
  interface QueueItem {
    node: string;
    dist: number;
    actualDist: number;
    path: string[];
    edges: Edge[];
    transfers: number;
    lastLine: string | null;
  }

  const queue: QueueItem[] = [];
  const visited: Record<string, number> = {};
  
  queue.push({
    node: originName,
    dist: 0,
    actualDist: 0,
    path: [originName],
    edges: [],
    transfers: 0,
    lastLine: null
  });
  
  let bestResult: any = null;
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const curr = queue.shift()!;
    
    if (curr.node === destinationName) {
      if (bestResult === null || curr.dist < bestResult.dist) {
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
      if (excludedLines.includes(conn.line)) {
        continue;
      }
      
      const edgeDist = conn.distance;
      let weight = edgeDist;
      let isTransfer = false;
      
      if (curr.lastLine && curr.lastLine !== conn.line && conn.line !== "WALKWAY") {
        weight += 3.0;
        isTransfer = true;
      }
      
      if (conn.line === "WALKWAY") {
        weight += 2.0;
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

export const lineStations: Record<string, { code: string; name: string; distance?: number }[]> = {
  "KJ": KJ_Line,
  "AG": AG_Line,
  "SP": SP_Line,
  "KG": KG_Line,
  "PY": PY_Line,
  "MR": MR_Line,
  "BRT": BRT_Line,
  "SA": SA_Line,
};
