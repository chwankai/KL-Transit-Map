import { stations } from "./transit-data";
import type { Route, Edge } from "./transit-data";

export async function geocodeStation(stationName: string) {
  let apiName = stationName;
  if (stationName === "Tun Razak Exchange (TRX)") {
    apiName = "Tun Razak Exchange";
  } else if (stationName === "Jambatan Kota") {
    apiName = "Pasar Jawa";
  }
  const url = `https://jp-web.myrapid.com.my/endpoint/geoservice/geocode?scope=WMcentral&agency=rapidkl&input=${encodeURIComponent(apiName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding failed for ${stationName}`);
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No coordinates found for ${stationName}`);
  }
  // Prioritize matching rail transit stations
  const railCategories = [
    "KJ", "KG", "PY", "AG", "SP", "MR", "BRT", "SA", 
    "MRT", "LRT", "Monorail", "PYL", "KGL", "KJL", 
    "AGL", "SPL", "MRL", "SAL"
  ];
  const railResult = data.results.find(
    (r: any) => railCategories.includes(r.category) || railCategories.includes(r.type)
  );
  return railResult || data.results[0];
}

export function mapApiLineId(apiLineId: string): string {
  const mapping: Record<string, string> = {
    "KJL": "KJ",
    "AGL": "AG",
    "SPL": "SP",
    "KGL": "KG",
    "PYL": "PY",
    "MRL": "MR",
    "SAL": "SA",
    "BRT": "BRT",
  };
  return mapping[apiLineId] || apiLineId;
}

export function findStationByCodeOrName(code: string | null, name: string | null): string | null {
  const cleanCode = code ? code.trim().toUpperCase() : "";
  if (cleanCode) {
    for (const key of Object.getOwnPropertyNames(stations)) {
      const stationObj = stations[key];
      if (stationObj.codes.some((c) => c.toUpperCase() === cleanCode)) {
        return stationObj.name;
      }
    }
  }

  const cleanName = name ? name.replace(/\s*-\s*.+$/, "").trim().toUpperCase() : "";
  if (cleanName) {
    for (const key of Object.getOwnPropertyNames(stations)) {
      if (key.toUpperCase() === cleanName) {
        return stations[key].name;
      }
    }
  }
  return null;
}

export function convertApiRoute(apiRoute: any, excluded?: string[]): Route {
  const edges: Edge[] = [];
  const path: string[] = [];
  let transfers = 0;
  const legs = apiRoute.legs || [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (leg.type === "transit" && leg.steps && leg.steps.length > 0) {
      const apiLine = leg.route_details ? leg.route_details.route_short_name : "";
      const lineId = mapApiLineId(apiLine);

      if (excluded && excluded.includes(lineId)) {
        throw new Error(`Route uses excluded line: ${lineId}`);
      }

      for (let j = 0; j < leg.steps.length; j++) {
        const step = leg.steps[j];
        const stationName = findStationByCodeOrName(step.stop_id, step.stop_name);

        if (!stationName) {
          throw new Error(`Route contains non-rail station: ${step.stop_name}`);
        }

        if (path.length === 0 || path[path.length - 1] !== stationName) {
          path.push(stationName);
        }

        if (j > 0) {
          const prevStep = leg.steps[j - 1];
          const prevStation = findStationByCodeOrName(prevStep.stop_id, prevStep.stop_name);
          if (!prevStation) {
            throw new Error(`Route contains non-rail station: ${prevStep.stop_name}`);
          }
          edges.push({
            from: prevStation,
            to: stationName,
            line: lineId,
            distance: leg.distance / (leg.steps.length - 1) / 1000,
          });
        }
      }
    } else if (leg.type === "pedestrain" || leg.type === "pedestrian") {
      transfers++;
      let fromStation: string | null = null;
      let toStation: string | null = null;

      if (i > 0 && legs[i - 1].steps && legs[i - 1].steps.length > 0) {
        const prevSteps = legs[i - 1].steps;
        const lastStep = prevSteps[prevSteps.length - 1];
        fromStation = findStationByCodeOrName(lastStep.stop_id, lastStep.stop_name);
      }
      if (i < legs.length - 1 && legs[i + 1].steps && legs[i + 1].steps.length > 0) {
        const nextSteps = legs[i + 1].steps;
        const firstStep = nextSteps[0];
        toStation = findStationByCodeOrName(firstStep.stop_id, firstStep.stop_name);
      }

      if (fromStation && toStation && fromStation !== toStation) {
        if (path.length === 0 || path[path.length - 1] !== fromStation) {
          path.push(fromStation);
        }
        path.push(toStation);
        edges.push({
          from: fromStation,
          to: toStation,
          line: "WALKWAY",
          distance: (leg.distance || 0) / 1000,
        });
      }
    }
  }

  const transitLines: string[] = [];
  legs.forEach((leg: any) => {
    if (leg.type === "transit" && leg.route_details) {
      transitLines.push(leg.route_details.route_short_name);
    }
  });
  transfers = Math.max(0, transitLines.length - 1);

  const cashlessFare =
    apiRoute.alt_fare_price && apiRoute.alt_fare_price.cashless
      ? parseFloat(apiRoute.alt_fare_price.cashless)
      : null;
  const cashFare =
    apiRoute.alt_fare_price && apiRoute.alt_fare_price.cash
      ? parseFloat(apiRoute.alt_fare_price.cash)
      : null;
  const concessionFare =
    apiRoute.alt_fare_price && apiRoute.alt_fare_price.consession
      ? parseFloat(apiRoute.alt_fare_price.consession)
      : null;

  // Compute duration
  const totalDurSec =
    apiRoute.total_duration ||
    apiRoute.totalDuration ||
    apiRoute.duration ||
    apiRoute.total_time ||
    null;

  let computedDur = totalDurSec;
  if (!computedDur && apiRoute._etaDepart && apiRoute._etaArrive) {
    const [dh, dm] = apiRoute._etaDepart.split(":").map(Number);
    const [ah, am] = apiRoute._etaArrive.split(":").map(Number);
    const diffMin = ah * 60 + am - (dh * 60 + dm);
    if (diffMin > 0) computedDur = diffMin * 60;
  }

  return {
    path,
    edges,
    totalDistance: (apiRoute.total_distance || 0) / 1000,
    totalFare: cashlessFare || 0,
    cashFare,
    concessionFare,
    transfers,
    etaDepart: apiRoute._etaDepart || null,
    etaArrive: apiRoute._etaArrive || null,
    totalDurationSec: computedDur,
    legMeta: apiRoute._legMeta || [],
  };
}

export function extractDirection(headsign: string): string | null {
  if (!headsign) return null;
  const match = headsign.match(/to (.+)$/i);
  return match ? match[1].trim() : null;
}

export function formatApiTime(dtStr: string): string | null {
  if (!dtStr) return null;
  const timePart = dtStr.split(" ")[1];
  if (!timePart) return null;
  return timePart.substring(0, 5);
}

export async function fetchSingleRoute(
  flng: number,
  flat: number,
  tlng: number,
  tlat: number,
  type: string,
  departureTime: string
): Promise<Route[]> {
  const url = `https://jp-web.myrapid.com.my/endpoint/geoservice/journeyPlanner?agency=rapidkl&flng=${flng}&flat=${flat}&tlng=${tlng}&tlat=${tlat}&mode=rail&type=${type}&departure_datetime=${encodeURIComponent(
    departureTime
  )}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API failed for type=${type}`);
  const data = await response.json();
  if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
    throw new Error(`No routes from API type=${type}`);
  }

  const validRoutes: Route[] = [];
  for (const raw of data.routes) {
    try {
      const legs = raw.legs || [];
      const legMeta: any[] = [];
      let firstDepartTime: string | null = null;
      let lastArriveTime: string | null = null;

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (leg.type === "transit") {
          const deptStr = formatApiTime(leg.estimated_departure_time);
          const arrStr = formatApiTime(leg.estimated_end_arrival_time);
          const direction = extractDirection(leg.route_details ? leg.route_details.headsign : "");
          legMeta.push({ type: "transit", departTime: deptStr, arriveTime: arrStr, direction });
          if (!firstDepartTime && deptStr) firstDepartTime = deptStr;
          if (arrStr) lastArriveTime = arrStr;
        } else {
          legMeta.push({ type: leg.type });
        }
      }

      raw._etaDepart = firstDepartTime;
      raw._etaArrive = lastArriveTime;
      raw._legMeta = legMeta;

      const converted = convertApiRoute(raw);
      validRoutes.push(converted);
    } catch (err: any) {
      console.warn(`Skipping invalid sub-route:`, err.message);
    }
  }

  if (validRoutes.length === 0) throw new Error(`No valid rail routes from API type=${type}`);
  return validRoutes;
}

export async function fetchMyRapidRoute(
  origin: string,
  dest: string,
  departureTime: string
): Promise<Route[]> {
  const originGeo = await geocodeStation(origin);
  const destGeo = await geocodeStation(dest);

  const flng = originGeo.geometry.coordinates[0];
  const flat = originGeo.geometry.coordinates[1];
  const tlng = destGeo.geometry.coordinates[0];
  const tlat = destGeo.geometry.coordinates[1];

  const routeTypes = [
    { type: "fastest", label: "⚡ Fastest" },
    { type: "leastchange", label: "🔄 Fewest Stops" },
    { type: "leastwalk", label: "🚶 Least Walk" },
  ];

  const results = await Promise.allSettled(
    routeTypes.map((rt) => fetchSingleRoute(flng, flat, tlng, tlat, rt.type, departureTime))
  );

  const routes: Route[] = [];
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      result.value.forEach((route, subIdx) => {
        const label =
          subIdx === 0
            ? routeTypes[idx].label
            : `${routeTypes[idx].label} (Option ${subIdx + 1})`;
        route._routeLabel = label;
        route._routeType = routeTypes[idx].type;
        routes.push(route);
      });
    }
  });

  const seen = new Set<string>();
  const unique: Route[] = [];
  for (const r of routes) {
    const pathKey = r.path.join("->");
    if (seen.has(pathKey)) continue;
    seen.add(pathKey);
    unique.push(r);
  }

  unique.forEach((route, idx) => {
    if (idx === 0) route._routeLabel = "Best";
    else route._routeLabel = `Alternative ${idx}`;
  });

  if (unique.length === 0) throw new Error("No valid routes from API");
  return unique.slice(0, 3);
}

export function getCurrentDateTime(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}

export function subtractSecondsFromDatetime(dtStr: string, seconds: number): string {
  const [datePart, timePart] = dtStr.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const totalMinutes = h * 60 + m - Math.ceil(seconds / 60);
  const [y, mo, d] = datePart.split("-").map(Number);
  const base = new Date(y, mo - 1, d, 0, totalMinutes, 0);
  const rh = String(base.getHours()).padStart(2, "0");
  const rm = String(base.getMinutes()).padStart(2, "0");
  const rd = String(base.getDate()).padStart(2, "0");
  const rmo = String(base.getMonth() + 1).padStart(2, "0");
  return `${base.getFullYear()}-${rmo}-${rd} ${rh}:${rm}:00`;
}
