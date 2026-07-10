/**
 * gtfs-schedule.ts
 *
 * Frequency-based departure time computation for KL Rail stations.
 *
 * Algorithm (from kl-rail-times methodology):
 *   1. Load gtfs_data.json (template stop offsets + frequency windows + calendar)
 *   2. For the current time & day, find which service(s) are active
 *   3. Get this station's offset (seconds from first stop) from the template trip
 *   4. For each frequency window: generate base departures from first stop, add offset
 *   5. Filter to show only future arrivals, return next N
 */

// ── Types matching gtfs_data.json ─────────────────────────────────────────────
interface FreqWindow {
  start_secs: number;  // seconds from midnight
  end_secs: number;
  headway_secs: number;
}

interface ServiceSchedule {
  service_id: string;
  frequencies: FreqWindow[];
  offsets: Record<string, number>; // NORMALIZED_STATION_NAME → seconds from first stop
}

interface DirectionData {
  services: ServiceSchedule[];
}

interface LineData {
  directions: Record<string, DirectionData>; // headsign → direction data
}

interface CalendarEntry {
  weekday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface GtfsData {
  calendar: Record<string, CalendarEntry>;
  lines: Record<string, LineData>;
}

// ── Result type ───────────────────────────────────────────────────────────────
export interface DepartureResult {
  timeStr: string;      // "HH:MM" — scheduled arrival time at this station
  targetSecs: number;   // target seconds from midnight
}

// ── Lazy-loaded singleton ─────────────────────────────────────────────────────
let _gtfsData: GtfsData | null = null;

async function getGtfsData(): Promise<GtfsData> {
  if (_gtfsData) return _gtfsData;
  const resp = await fetch("/gtfs_data.json");
  if (!resp.ok) throw new Error("Failed to load gtfs_data.json");
  _gtfsData = await resp.json() as GtfsData;
  return _gtfsData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function secsToHHMM(totalSecs: number): string {
  const s = ((totalSecs % 86400) + 86400) % 86400;
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return `${hh}:${mm}`;
}

function currentDayType(now: Date): "weekday" | "saturday" | "sunday" {
  const d = now.getDay();
  if (d === 6) return "saturday";
  if (d === 0) return "sunday";
  return "weekday";
}

function normalizeName(name: string): string {
  let norm = name.trim().toUpperCase()
    .replace(/\s+STATION\s*$/i, "")
    .replace(/\s+(LRT|MRT|MONORAIL|KTM)\s*$/i, "")
    .trim();

  if (norm === "TTDI") {
    return "TAMAN TUN DR ISMAIL";
  }
  if (norm === "KENTONMEN") {
    return "KENTOMEN";
  }
  return norm;
}

function serviceActive(cal: CalendarEntry, dayType: "weekday" | "saturday" | "sunday"): boolean {
  return !!cal[dayType];
}

/**
 * Look up the offset for a station within a service schedule.
 * Tries exact match first, then partial/fuzzy match.
 */
function findOffset(offsets: Record<string, number>, normStation: string): number | null {
  // 1. Exact match
  if (offsets[normStation] !== undefined) return offsets[normStation];

  // 2. Try matching when display name has extra words (e.g. "DATO' KERAMAT" vs "DATUK KERAMAT")
  for (const [key, val] of Object.entries(offsets)) {
    if (key === normStation) return val;
    // One contains the other
    if (key.includes(normStation) || normStation.includes(key)) return val;
  }

  // 3. Token overlap: ≥ 2 tokens match
  const stationTokens = new Set(normStation.split(/\s+/));
  let bestMatch: [string, number] | null = null;
  let bestScore = 0;
  for (const [key, val] of Object.entries(offsets)) {
    const keyTokens = key.split(/\s+/);
    const overlap = keyTokens.filter(t => stationTokens.has(t)).length;
    if (overlap > bestScore) { bestScore = overlap; bestMatch = [key, val]; }
  }
  if (bestScore >= 2 && bestMatch) return bestMatch[1];

  return null;
}

// ── Main exports ──────────────────────────────────────────────────────────────

/**
 * Compute the next N upcoming arrivals at `stationName` for a given line + direction.
 *
 * @param stationName  Display name (e.g. "Ampang", "KL Sentral")
 * @param lineId       Line code (e.g. "AG", "KJ", "KG", "SP")
 * @param headsign     GTFS direction headsign (e.g. "From Ampang to Sentul Timur")
 * @param now          Current Date object
 * @param count        Number of upcoming arrivals to return (default 3)
 */
export async function getNextDepartures(
  stationName: string,
  lineId: string,
  headsign: string,
  now: Date,
  count = 3,
): Promise<DepartureResult[]> {
  const gtfs = await getGtfsData();
  const dirData = gtfs.lines[lineId]?.directions[headsign];
  if (!dirData) return [];

  const normStation = normalizeName(stationName);
  const dayType = currentDayType(now);
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const upcoming: number[] = [];

  for (const svc of dirData.services) {
    const cal = gtfs.calendar[svc.service_id];
    if (!cal || !serviceActive(cal, dayType)) continue;

    const offsetSecs = findOffset(svc.offsets, normStation);
    if (offsetSecs === null) continue;

    for (const win of svc.frequencies) {
      // Generate all base departures from first stop within this window
      let base = win.start_secs;
      while (base < win.end_secs) {
        const arrivalAtStation = base + offsetSecs;
        // Only keep future arrivals within the next 3 hours
        if (arrivalAtStation > nowSecs && arrivalAtStation <= nowSecs + 10800) {
          upcoming.push(arrivalAtStation);
        }
        base += win.headway_secs;
      }
    }
  }

  upcoming.sort((a, b) => a - b);
  const deduped = [...new Set(upcoming)].slice(0, count);

  return deduped.map(arrSecs => ({
    timeStr: secsToHHMM(arrSecs),
    targetSecs: arrSecs,
  }));
}

/**
 * Get all scheduled arrival times for a full-day timetable display.
 *
 * @param stationName  Display name
 * @param lineId       Line code
 * @param headsign     GTFS direction headsign
 * @param dayType      "weekday" | "saturday" | "sunday"
 */
export async function getFullTimetable(
  stationName: string,
  lineId: string,
  headsign: string,
  dayType: "weekday" | "saturday" | "sunday",
): Promise<string[]> {
  const gtfs = await getGtfsData();
  const dirData = gtfs.lines[lineId]?.directions[headsign];
  if (!dirData) return [];

  const normStation = normalizeName(stationName);
  const allSecs: number[] = [];

  for (const svc of dirData.services) {
    const cal = gtfs.calendar[svc.service_id];
    if (!cal || !serviceActive(cal, dayType)) continue;

    const offsetSecs = findOffset(svc.offsets, normStation);
    if (offsetSecs === null) continue;

    for (const win of svc.frequencies) {
      let base = win.start_secs;
      while (base < win.end_secs) {
        const arr = base + offsetSecs;
        if (arr >= 0 && arr < 90000) allSecs.push(arr); // allow slightly past midnight
        base += win.headway_secs;
      }
    }
  }

  const sorted = [...new Set(allSecs)].sort((a, b) => a - b);
  return sorted.map(secsToHHMM);
}

/**
 * Returns first/last train times for a station across all directions on a given day.
 * Starts from time after 3:00 AM (to handle previous day's late night schedule running after midnight).
 */
export async function getOperationalHours(
  stationName: string,
  lineId: string,
  dayType: "weekday" | "saturday" | "sunday",
): Promise<{ first: string; last: string } | null> {
  const gtfs = await getGtfsData();
  const lineData = gtfs.lines[lineId];
  if (!lineData) return null;

  const allTimes: string[] = [];
  for (const headsign of Object.keys(lineData.directions)) {
    const times = await getFullTimetable(stationName, lineId, headsign, dayType);
    allTimes.push(...times);
  }
  if (allTimes.length === 0) return null;

  const dayTimes = allTimes.filter(t => {
    const [h] = t.split(":").map(Number);
    return h >= 3;
  });
  const nightTimes = allTimes.filter(t => {
    const [h] = t.split(":").map(Number);
    return h < 3;
  });

  dayTimes.sort();
  nightTimes.sort();

  const first = dayTimes[0] || nightTimes[0];
  const last = nightTimes[nightTimes.length - 1] || dayTimes[dayTimes.length - 1];

  return { first, last };
}

/**
 * Returns all headsigns (direction labels) for a given line from GTFS data.
 */
export async function getGtfsDirections(lineId: string): Promise<string[]> {
  const gtfs = await getGtfsData();
  return Object.keys(gtfs.lines[lineId]?.directions ?? {});
}
