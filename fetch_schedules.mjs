#!/usr/bin/env node
/**
 * fetch_schedules.mjs
 * Fetches GTFS stop_times.txt + trips.txt + calendar.txt from data.gov.my
 * and rebuilds public/station_schedules.json
 * Does NOT touch station_coords.json or rail_tracks.json
 */

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "public", "station_schedules.json");

// Prasarana GTFS base
const BASE = "https://api.data.gov.my/gtfs-static/prasarana";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    console.log(`  GET ${url}`);
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  });
}

// Infer a line ID from route_id + headsign text
function inferLineId(routeId = "", headsign = "") {
  const s = (routeId + " " + headsign).toUpperCase();
  if (/\bKJ\b|KELANA JAYA/.test(s)) return "KJ";
  if (/\bSP\b|SRI PETALING/.test(s)) return "SP";
  if (/\bAG\b|AMPANG/.test(s)) return "AG";
  if (/\bKG\b|KAJANG|PUTRAJAYA MRT/.test(s)) return "KG";
  if (/\bPY\b|PUTRAJAYA SENTRAL|PUTRAJAYA LINE/.test(s)) return "PY";
  if (/\bMR\b|MONORAIL/.test(s)) return "MR";
  if (/\bSB\b|BRT|SUNWAY/.test(s)) return "BRT";
  if (/\bSA\b|SHAH ALAM/.test(s)) return "SA";
  return null;
}

async function main() {
  console.log("Fetching GTFS schedule data from Prasarana...\n");

  // 1. Stops
  console.log("Fetching stops.txt...");
  const stopsText = await fetchText(`${BASE}/stops.txt`);
  const stops = parseCSV(stopsText);
  const stopNameById = {};
  for (const row of stops) {
    if (row.stop_id && row.stop_name) {
      stopNameById[row.stop_id] = row.stop_name.trim();
    }
  }
  console.log(`  -> ${Object.keys(stopNameById).length} stops\n`);

  // 2. Trips
  console.log("Fetching trips.txt...");
  const tripsText = await fetchText(`${BASE}/trips.txt`);
  const trips = parseCSV(tripsText);
  const tripById = {};
  for (const row of trips) {
    tripById[row.trip_id] = {
      route_id: row.route_id || "",
      service_id: row.service_id || "",
      headsign: row.trip_headsign || "",
      direction_id: row.direction_id || "0",
    };
  }
  console.log(`  -> ${Object.keys(tripById).length} trips\n`);

  // 3. Calendar
  console.log("Fetching calendar.txt...");
  const calendarById = {};
  try {
    const calText = await fetchText(`${BASE}/calendar.txt`);
    const calRows = parseCSV(calText);
    for (const row of calRows) {
      const sid = row.service_id;
      if (!sid) continue;
      const weekday = ["monday","tuesday","wednesday","thursday","friday"].some(d => row[d] === "1");
      calendarById[sid] = {
        weekday,
        saturday: row.saturday === "1",
        sunday: row.sunday === "1",
      };
    }
    console.log(`  -> ${Object.keys(calendarById).length} service entries\n`);
  } catch(e) {
    console.warn(`  calendar.txt not available: ${e.message}\n`);
  }

  // 4. Stop times (large file)
  console.log("Fetching stop_times.txt (this may take a while)...");
  const stText = await fetchText(`${BASE}/stop_times.txt`);
  const stRows = parseCSV(stText);
  console.log(`  -> ${stRows.length} stop_time rows\n`);

  // Build: stopId -> tripId -> departureTime (normalized HH:MM)
  const rawStopTimes = {}; // stop_id -> { trip_id: "HH:MM" }
  for (const row of stRows) {
    const sid = row.stop_id;
    const tid = row.trip_id;
    const dep = (row.departure_time || row.arrival_time || "").trim();
    if (!sid || !tid || !dep) continue;
    // Normalize past-midnight times (GTFS allows 25:xx etc.)
    const parts = dep.split(":");
    const h = parseInt(parts[0], 10) % 24;
    const normalized = `${String(h).padStart(2,"0")}:${parts[1]}`;
    if (!rawStopTimes[sid]) rawStopTimes[sid] = {};
    rawStopTimes[sid][tid] = normalized;
  }

  console.log("Building schedules...");
  const schedules = {}; // StationName -> LineId -> dirKey -> { weekday, saturday, sunday }

  for (const [stopId, depsByTrip] of Object.entries(rawStopTimes)) {
    const rawName = stopNameById[stopId];
    if (!rawName) continue;

    // Normalize name: strip trailing qualifiers, uppercase
    const normName = rawName
      .toUpperCase()
      .replace(/\s+STATION\s*$/, "")
      .replace(/\s+(LRT|MRT|MONORAIL)\s*$/, "")
      .trim();

    for (const [tripId, depTime] of Object.entries(depsByTrip)) {
      const trip = tripById[tripId];
      if (!trip) continue;

      const lineId = inferLineId(trip.route_id, trip.headsign);
      if (!lineId) continue;

      // Classify service days
      const svcCal = calendarById[trip.service_id];
      let dayTypes = [];
      if (svcCal) {
        if (svcCal.weekday) dayTypes.push("weekday");
        if (svcCal.saturday) dayTypes.push("saturday");
        if (svcCal.sunday) dayTypes.push("sunday");
      } else {
        // Fallback from service_id name
        const sid = trip.service_id.toLowerCase();
        if (sid.includes("sat")) dayTypes.push("saturday");
        else if (sid.includes("sun")) dayTypes.push("sunday");
        else if (sid.includes("wday") || sid.includes("weekday")) dayTypes.push("weekday");
        else dayTypes = ["weekday", "saturday", "sunday"]; // assume all
      }
      if (dayTypes.length === 0) dayTypes = ["weekday"];

      const dirKey = trip.headsign || `Direction ${trip.direction_id}`;

      if (!schedules[normName]) schedules[normName] = {};
      if (!schedules[normName][lineId]) schedules[normName][lineId] = {};
      if (!schedules[normName][lineId][dirKey]) {
        schedules[normName][lineId][dirKey] = { weekday: [], saturday: [], sunday: [] };
      }
      for (const dt of dayTypes) {
        schedules[normName][lineId][dirKey][dt].push(depTime);
      }
    }
  }

  // Sort and deduplicate
  let stationCount = 0;
  for (const stationData of Object.values(schedules)) {
    stationCount++;
    for (const lineData of Object.values(stationData)) {
      for (const dirData of Object.values(lineData)) {
        for (const dt of ["weekday", "saturday", "sunday"]) {
          dirData[dt] = [...new Set(dirData[dt])].sort();
        }
      }
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(schedules, null, 2));
  console.log(`\n✓ Wrote ${stationCount} stations to ${OUT_FILE}`);

  // Show sample
  const sample = Object.keys(schedules).slice(0, 3);
  for (const k of sample) {
    console.log(`\n  ${k}:`);
    for (const [lineId, lineData] of Object.entries(schedules[k])) {
      for (const [dirKey, dirData] of Object.entries(lineData)) {
        const wdTimes = dirData.weekday.slice(0, 5);
        console.log(`    [${lineId}] ${dirKey}: ${wdTimes.join(", ")} ... (${dirData.weekday.length} total weekday departures)`);
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
