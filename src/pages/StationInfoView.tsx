import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stations, lines } from "../lib/transit-data";
import type { StationObj } from "../lib/transit-data";
import {
  ArrowLeft, Clock, ArrowRight, Train, ChevronDown, ChevronUp,
  Navigation, Heart, RefreshCw, Map, X, ZoomIn, ZoomOut
} from "lucide-react";
import { Footer } from "../components/layout/Footer";
import { useSettings } from "../context/SettingsContext";
import {
  getNextDepartures,
  getFullTimetable,
  getOperationalHours,
  getGtfsDirections,
  type DepartureResult,
} from "../lib/gtfs-schedule";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0"); }

function fmtTime12(date: Date) {
  let h = date.getHours();
  const m = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  const ampm = h >= 12 ? "pm" : "am";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${pad2(h)}:${m}:${s} ${ampm}`;
}

function timeStrToTotalMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function groupByHour(times: string[]): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  for (const t of times) {
    const [h] = t.split(":").map(Number);
    if (!map[h]) map[h] = [];
    map[h].push(t);
  }
  return map;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DayTab = "weekday" | "saturday" | "sunday";

interface DirectionDeps {
  lineId: string;
  headsign: string;       // GTFS headsign
  displayDest: string;    // human-readable
  departures: DepartureResult[];
}

interface TimetableData {
  weekday: string[];
  saturday: string[];
  sunday: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const StationInfoView: React.FC = () => {
  const { stationName } = useParams<{ stationName: string }>();
  const navigate = useNavigate();
  const { language, t, tStation, tLine } = useSettings();

  const decodedName = stationName ? decodeURIComponent(stationName) : "";
  const station: StationObj | undefined = stations[decodedName];

  // Redirect to formal station name if accessed via legacy/alias name
  useEffect(() => {
    if (station && station.name !== decodedName) {
      navigate(`/station/${encodeURIComponent(station.name)}`, { replace: true });
    }
  }, [station, decodedName, navigate]);

  // ── Grouped / walkway connected stations helper ──
  const getGroupedStations = useCallback((baseName: string): string[] => {
    const group = [baseName];
    const baseStation = stations[baseName];
    if (baseStation) {
      baseStation.connections.forEach(conn => {
        if (conn.line === "WALKWAY") {
          group.push(conn.to);
        }
      });
    }
    return [...new Set(group)];
  }, []);

  const groupedStationNames = getGroupedStations(decodedName);
  
  // Collect all codes from the grouped stations
  const groupedCodes = groupedStationNames.flatMap(name => stations[name]?.codes ?? []);

  // ── Time state ──
  const [now, setNow] = useState(new Date());
  const [updatedAt, setUpdatedAt] = useState(new Date());

  // ── Departure data (async from GTFS) ──
  const [dirDeps, setDirDeps] = useState<DirectionDeps[]>([]);
  const [opHours, setOpHours] = useState<{ lineId: string; code: string; first: string; last: string }[]>([]);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);

  // ── Timetable per direction ──
  const [isTimetableExpanded, setIsTimetableExpanded] = useState<Record<string, boolean>>({});
  const [timetableTab, setTimetableTab] = useState<Record<string, DayTab>>({});
  const [timetableData, setTimetableData] = useState<Record<string, TimetableData>>({});

  // ── Favourites ──
  const [isFavourite, setIsFavourite] = useState(false);


  // ── Line metadata ──
  const stationLines = groupedCodes.map((code) => {
    const match = code.match(/^[a-zA-Z]+/);
    let lineId = match ? match[0] : "";
    if (lineId === "SB") lineId = "BRT";
    return lineId;
  }).filter((v, i, s) => s.indexOf(v) === i);

  const getLineColor = (lineId: string) => lines[lineId]?.color || "#6b7280";
  const getLineName = (lineId: string) => lines[lineId]?.name || lineId;

  // ── Station directory ──
  // Only KG (Kajang) and PY (Putrajaya) lines have directory maps available
  const directoryLines = ["KG", "PY"];
  const hasDirectory = stationLines.some(l => directoryLines.includes(l));
  const directoryUrl = hasDirectory ? `/location map/${encodeURIComponent(decodedName)}.png` : null;
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directoryImgExists, setDirectoryImgExists] = useState(false);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isDirLoading, setIsDirLoading] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTopPos, setScrollTopPos] = useState(0);
  const [touchStartDist, setTouchStartDist] = useState(0);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    if (delta < 0) {
      setZoomScale(s => Math.min(s + 0.15, 3.0));
    } else {
      setZoomScale(s => Math.max(s - 0.15, 1.0));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    if (imgContainerRef.current) {
      setStartX(e.pageX - imgContainerRef.current.offsetLeft);
      setStartY(e.pageY - imgContainerRef.current.offsetTop);
      setScrollLeft(imgContainerRef.current.scrollLeft);
      setScrollTopPos(imgContainerRef.current.scrollTop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imgContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - imgContainerRef.current.offsetLeft;
    const y = e.pageY - imgContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    imgContainerRef.current.scrollLeft = scrollLeft - walkX;
    imgContainerRef.current.scrollTop = scrollTopPos - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const getTouchDist = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].pageX - e.touches[1].pageX;
    const dy = e.touches[0].pageY - e.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setTouchStartDist(getTouchDist(e));
    } else if (e.touches.length === 1 && zoomScale > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      if (imgContainerRef.current) {
        setStartX(touch.pageX - imgContainerRef.current.offsetLeft);
        setStartY(touch.pageY - imgContainerRef.current.offsetTop);
        setScrollLeft(imgContainerRef.current.scrollLeft);
        setScrollTopPos(imgContainerRef.current.scrollTop);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDist = getTouchDist(e);
      if (touchStartDist > 0) {
        const scaleDiff = (currentDist - touchStartDist) * 0.007;
        setZoomScale(s => Math.min(Math.max(s + scaleDiff, 1.0), 3.0));
      }
      setTouchStartDist(currentDist);
    } else if (e.touches.length === 1 && isDragging && imgContainerRef.current) {
      const touch = e.touches[0];
      const x = touch.pageX - imgContainerRef.current.offsetLeft;
      const y = touch.pageY - imgContainerRef.current.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      imgContainerRef.current.scrollLeft = scrollLeft - walkX;
      imgContainerRef.current.scrollTop = scrollTopPos - walkY;
    }
  };

  useEffect(() => {
    if (!directoryUrl) {
      setDirectoryImgExists(false);
      setIsDirLoading(false);
      return;
    }
    setIsDirLoading(true);
    const img = new Image();
    img.onload = () => {
      // Simulate slow loading delay of 1.2 seconds
      setTimeout(() => {
        setDirectoryImgExists(true);
        setIsDirLoading(false);
      }, 1200);
    };
    img.onerror = () => {
      setDirectoryImgExists(false);
      setIsDirLoading(false);
    };
    img.src = directoryUrl;
  }, [directoryUrl]);

  useEffect(() => {
    if (!directoryModalOpen) {
      setZoomScale(1);
    }
  }, [directoryModalOpen]);

  // ── Favourites ──
  useEffect(() => {
    if (!decodedName) return;
    const favs: string[] = JSON.parse(localStorage.getItem("favourite_stations") || "[]");
    setIsFavourite(favs.includes(decodedName));
  }, [decodedName]);

  const toggleFavourite = () => {
    const favs: string[] = JSON.parse(localStorage.getItem("favourite_stations") || "[]");
    const updated = isFavourite
      ? favs.filter((f) => f !== decodedName)
      : [...favs, decodedName].sort();
    localStorage.setItem("favourite_stations", JSON.stringify(updated));
    setIsFavourite(!isFavourite);
  };

  // ── 1-second ticker for countdown display ──
  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // ── GTFS departure lookup ──
  const loadDepartures = useCallback(async (atTime: Date) => {
    if (!station) return;
    setIsLoadingDeps(true);
    try {
      const results: DirectionDeps[] = [];
      const opHoursResult: { lineId: string; code: string; first: string; last: string }[] = [];

      // Current day type for operational hours
      const d = atTime.getDay();
      const dayType: DayTab = d === 6 ? "saturday" : d === 0 ? "sunday" : "weekday";

      for (const lineId of stationLines) {
        // Find which station in the group actually has this code or matches this lineId
        const matchingStationName = groupedStationNames.find(name => {
          const s = stations[name];
          return s?.codes.some(c => {
            const match = c.match(/^[a-zA-Z]+/);
            let id = match ? match[0] : "";
            if (id === "SB") id = "BRT";
            return id === lineId;
          });
        }) || decodedName;

        // Get all GTFS directions for this line
        const headsigns = await getGtfsDirections(lineId);

        // For operational hours: aggregate across all directions
        const ohResult = await getOperationalHours(matchingStationName, lineId, dayType);
        const code = (stations[matchingStationName]?.codes ?? []).find(c => {
          const m = c.match(/^[a-zA-Z]+/);
          let id = m ? m[0] : "";
          if (id === "SB") id = "BRT";
          return id === lineId;
        }) || lineId;
        if (ohResult) {
          opHoursResult.push({ lineId, code, first: ohResult.first, last: ohResult.last });
        }

        // For each direction, get next departures
        for (const headsign of headsigns) {
          const toMatch = headsign.match(/to (.+)$/i);
          let displayDest = toMatch ? toMatch[1].trim() : headsign;

          // Map "Putrajaya" destination to "Putrajaya Sentral"
          if (displayDest === "Putrajaya") {
            displayDest = "Putrajaya Sentral";
          }

          // Skip if this station IS the destination
          if (displayDest.toUpperCase() === matchingStationName.toUpperCase()) continue;

          const deps = await getNextDepartures(matchingStationName, lineId, headsign, atTime, 3);
          if (deps.length > 0) {
            results.push({ lineId, headsign, displayDest, departures: deps });
          }
        }
      }

      setDirDeps(results);
      setOpHours(opHoursResult);
      setUpdatedAt(new Date());
    } catch (e) {
      console.warn("GTFS schedule load failed:", e);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [decodedName, station, stationLines.join(","), groupedStationNames.join(",")]);

  // Initial load + auto-refresh every 10s
  useEffect(() => {
    loadDepartures(new Date());
    const timer = setInterval(() => loadDepartures(new Date()), 10000);
    return () => clearInterval(timer);
  }, [loadDepartures]);

  // ── Load timetable for expanded view ──
  const loadTimetable = useCallback(async (key: string, lineId: string, headsign: string) => {
    if (timetableData[key]?.weekday) return; // already loaded

    const matchingStationName = groupedStationNames.find(name => {
      const s = stations[name];
      return s?.codes.some(c => {
        const match = c.match(/^[a-zA-Z]+/);
        let id = match ? match[0] : "";
        if (id === "SB") id = "BRT";
        return id === lineId;
      });
    }) || decodedName;

    const [wd, sa, su] = await Promise.all([
      getFullTimetable(matchingStationName, lineId, headsign, "weekday"),
      getFullTimetable(matchingStationName, lineId, headsign, "saturday"),
      getFullTimetable(matchingStationName, lineId, headsign, "sunday"),
    ]);
    setTimetableData(prev => ({ ...prev, [key]: { weekday: wd, saturday: sa, sunday: su } }));
  }, [decodedName, timetableData, groupedStationNames]);

  const toggleTimetable = (key: string, lineId: string, headsign: string) => {
    const nowExpanded = !isTimetableExpanded[key];
    setIsTimetableExpanded(prev => ({ ...prev, [key]: nowExpanded }));
    if (nowExpanded) loadTimetable(key, lineId, headsign);
  };

  // ── Day type helper ──
  const getDayType = (d: Date): DayTab => {
    const day = d.getDay();
    if (day === 6) return "saturday";
    if (day === 0) return "sunday";
    return "weekday";
  };

  // ── Departure badge label ──
  const depLabel = (secsAway: number, isFirst: boolean) => {
    const minUnit = t("minUnit") || "m";
    const secUnit = t("secUnit") || "s";

    if (secsAway < 0) {
      return { label: t("passed"), chip: null, chipColor: "", isPast: true };
    }
    if (secsAway <= 30) {
      return { label: isFirst ? t("arriving") : `0${minUnit}`, chip: "Arriving", chipColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30 animate-pulse", isPast: false };
    }
    const mins = Math.floor(secsAway / 60);
    const secs = secsAway % 60;
    const label = isFirst ? (mins > 0 ? `${mins}${minUnit}${secs}${secUnit}` : `${secs}${secUnit}`) : `${mins}${minUnit}`;

    if (secsAway <= 120) {
      return { label, chip: "Approaching", chipColor: "text-amber-500 bg-amber-500/10 border-amber-500/30 animate-pulse", isPast: false };
    }
    return { label, chip: null, chipColor: "", isPast: false };
  };

  // ── Group directions by line for display ──
  const depsByLine = stationLines.map(lineId => ({
    lineId,
    directions: dirDeps.filter(d => d.lineId === lineId),
  }));

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-lg font-bold text-text-primary mb-2">Station Not Found</h2>
        <p className="text-xs text-text-secondary mb-4">The station "{decodedName}" does not exist in our network.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md"
        >
          Back to Map
        </button>
      </div>
    );
  }

  const isWeekend = (() => { const d = now.getDay(); return d === 0 || d === 6; })();

  return (
    <div className="flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in">
      <div className="max-w-6xl mx-auto w-full px-5 py-6 space-y-6 flex-1">

        {/* ── Header bar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Left: back + title + name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary transition-all active:scale-90 shadow-md flex-shrink-0"
              title={t("backToMap")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{t("stationInfo")}</div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">{tStation(decodedName)}</h1>
              {language === "zh" && (
                <div className="text-[11px] text-text-secondary font-medium mt-0.5 leading-none">{decodedName}</div>
              )}
              {groupedStationNames.length > 1 && (
                <div className="text-[10px] text-text-secondary font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{t("connectedTo")}</span>
                  {groupedStationNames
                    .filter(n => n !== decodedName)
                    .map((name, idx, arr) => (
                      <React.Fragment key={name}>
                        <a
                          href={`#/station/${encodeURIComponent(name)}`}
                          className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-semibold"
                        >
                          <span className="inline-flex items-center gap-1 flex-wrap">
                            <span>{tStation(name)}</span>
                            {language === "zh" && (
                              <span className="text-[8px] font-normal text-text-secondary leading-none">({name})</span>
                            )}
                          </span>
                        </a>
                        {idx < arr.length - 1 && <span className="text-text-secondary">,</span>}
                      </React.Fragment>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: updated time + refresh */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("updated")} {fmtTime12(updatedAt)}
            </span>
            <button
              onClick={() => loadDepartures(new Date())}
              title="Refresh departures"
              className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary hover:border-blue-500 transition-all active:scale-90 shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className={language === "zh" ? "zh-body flex flex-col lg:flex-row gap-6" : "flex flex-col lg:flex-row gap-6"}>

          {/* ── Left panel: Info card ── */}
          <div className="lg:w-80 xl:w-88 flex-shrink-0 space-y-4">
            <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">

              {/* Station code badges + action buttons */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                  {groupedCodes.map((code) => {
                    const match = code.match(/^[a-zA-Z]+/);
                    let lineId = match ? match[0] : "";
                    if (lineId === "SB") lineId = "BRT";
                    return (
                      <span
                        key={code}
                        style={{ backgroundColor: getLineColor(lineId) }}
                        className="text-xs font-extrabold text-white px-2.5 py-1 rounded shadow-sm"
                      >
                        {code}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    title="Plan route to this station"
                    onClick={() => navigate(`/plan?dest=${encodeURIComponent(decodedName)}`)}
                    className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-blue-500 hover:border-blue-500 transition-all active:scale-90 shadow-sm"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                  <button
                    title={isFavourite ? "Remove from favourites" : "Add to favourites"}
                    onClick={toggleFavourite}
                    className={`p-2 rounded-xl border transition-all active:scale-90 shadow-sm ${
                      isFavourite
                        ? "border-red-500/40 bg-red-500/10 text-red-500"
                        : "border-border bg-card text-text-secondary hover:text-red-400 hover:border-red-400"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavourite ? "fill-red-500" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Operational Hours from GTFS */}
              {opHours.length > 0 && (
                <div className="pt-3 border-t border-border/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    {t("hoursOfOperation")}
                  </div>
                  <div className="space-y-1.5">
                    {opHours.map(({ lineId, code, first, last }) => (
                      <div key={lineId} className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: getLineColor(lineId) }}
                          className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded leading-none"
                        >
                          {code}
                        </span>
                        <span className="text-xs font-semibold text-text-primary">
                          {first} – {last}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Park n' Ride Facility */}
              {station?.facility?.includes("P") && (
                <div className="pt-3 border-t border-border/80 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-500 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20 select-none w-fit">
                    <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-black">P</span>
                    <span>Park n' Ride</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Station Directory ── */}
            {hasDirectory && (
              <div>
                {/* Mobile: toggle button */}
                <div className="block lg:hidden">
                  <button
                    onClick={() => setDirectoryOpen(p => !p)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary hover:border-blue-500 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Map className="h-3.5 w-3.5" />
                    {directoryOpen ? t("closeDirectory") : t("openDirectory")}
                  </button>
                </div>

                {/* Desktop: always visible; Mobile: only when open */}
                <div className={`${directoryOpen ? "block" : "hidden lg:block"} mt-3 lg:mt-0`}>
                  <div className="glass-panel rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                      <Map className="h-3.5 w-3.5 text-text-secondary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{t("stationDirectory")}</span>
                    </div>
                    {isDirLoading ? (
                      <div className="p-4">
                        <div className="w-full aspect-square bg-button-secondary rounded-xl animate-pulse"></div>
                      </div>
                    ) : (
                      directoryImgExists && directoryUrl && (
                        <div
                          className="cursor-zoom-in hover:brightness-95 transition-all flex justify-center"
                          onClick={() => setDirectoryModalOpen(true)}
                          title="Click to enlarge"
                        >
                          <img
                            src={directoryUrl}
                            alt={`${decodedName} station directory`}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel: Next departures ── */}
          <div className="flex-1 min-w-0 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary select-none">
              {t("nextDepartures")}
            </h2>

            {isLoadingDeps && dirDeps.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-text-secondary">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">{t("loadingSchedule")}</span>
              </div>
            ) : (
              depsByLine.map(({ lineId, directions }) => {
                const lineColor = getLineColor(lineId);
                if (directions.length === 0) return null;

                return (
                  <div
                    key={lineId}
                    className="glass-panel rounded-2xl border border-border bg-card shadow-lg overflow-hidden"
                  >
                    {/* Full-height left color bar + content */}
                    <div className="flex overflow-hidden">
                      <div style={{ backgroundColor: lineColor }} className="w-1 flex-shrink-0 self-stretch" />
                      <div className="flex-1">
                        {/* Line title */}
                        <div className="p-4 bg-button-secondary/15 flex items-center gap-2">
                          <Train style={{ color: lineColor }} className="h-5 w-5" />
                          <span className="flex flex-col">
                            <span className="text-sm font-bold text-text-primary">{tLine(getLineName(lineId))}</span>
                            {language === "zh" && (
                              <span className="text-[10px] font-normal text-text-secondary leading-none mt-0.5">{getLineName(lineId)}</span>
                            )}
                          </span>
                        </div>

                        <div className="p-5 divide-y divide-border/60">
                          {directions.map((dir) => {
                            const key = `${lineId}_${dir.headsign}`;
                            const isExpanded = isTimetableExpanded[key] || false;
                            const activeTab = timetableTab[key] || (isWeekend ? "saturday" : "weekday");
                            const ttData = timetableData[key];
                            const timetable = ttData?.[activeTab] ?? [];
                            const hourGroups = groupByHour(timetable);
                            const currentTotalSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                            const currentTotalMins = now.getHours() * 60 + now.getMinutes();

                            return (
                              <div key={dir.headsign} className="py-4 first:pt-0 last:pb-0 space-y-4">
                                <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                                  {/* Direction label + status chip */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">{t("towards")}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                                        <ArrowRight className="h-4 w-4 text-text-secondary self-start mt-0.5" />
                                        <span className="flex flex-col">
                                          <span>{tStation(dir.displayDest)}</span>
                                          {language === "zh" && (
                                            <span className="text-[10px] font-normal text-text-secondary leading-none mt-0.5">{dir.displayDest}</span>
                                          )}
                                        </span>
                                      </span>
                                      {/* Approaching/Arriving chip for nearest train */}
                                      {(() => {
                                        const first = dir.departures[0];
                                        if (!first) return null;
                                        let secsAway = first.targetSecs - currentTotalSecs;
                                        if (secsAway < -60) secsAway += 86400;
                                        const { chip, chipColor } = depLabel(secsAway, true);
                                        if (!chip) return null;
                                        return (
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${chipColor}`}>
                                            {t(chip.toLowerCase())}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Countdown badges */}
                                  <div className="flex gap-2 flex-wrap">
                                    {dir.departures.length === 0 ? (
                                      <div className="flex items-center justify-center px-4 py-2 bg-button-secondary/35 border border-border/40 text-text-secondary/60 text-xs font-bold rounded-xl select-none uppercase tracking-wider">
                                        {t("serviceEnd")}
                                      </div>
                                    ) : (
                                      dir.departures.map((dep, dIdx) => {
                                        let secsAway = dep.targetSecs - currentTotalSecs;
                                        if (secsAway < -60) secsAway += 86400;
                                        const { label, isPast } = depLabel(secsAway, dIdx === 0);
                                        const isFirst = dIdx === 0;
                                        return (
                                          <div
                                            key={dIdx}
                                            className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl border text-center w-[92px] sm:w-[98px] flex-shrink-0 ${
                                              isPast
                                                ? "bg-button-secondary/30 border-border/40 text-text-secondary/40"
                                                : isFirst
                                                ? "bg-blue-600/10 border-blue-500/35 text-blue-500"
                                                : "bg-card border-border/80 text-text-primary"
                                            }`}
                                          >
                                            <span className="text-xs font-extrabold">{label}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-wider text-text-secondary/70 mt-0.5">{dep.timeStr}</span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>

                                {/* View Full Timetable toggle */}
                                <div className="pt-1">
                                  <button
                                    onClick={() => toggleTimetable(key, lineId, dir.headsign)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors uppercase tracking-wider"
                                  >
                                    {isExpanded ? (
                                      <><ChevronUp className="h-3 w-3" />{t("hide") || "Hide"} {t("fullTimetable")}</>
                                    ) : (
                                      <><ChevronDown className="h-3 w-3" />{t("view") || "View"} {t("fullTimetable")}</>
                                    )}
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-3 rounded-xl border border-border bg-button-secondary/15 animate-fade-in overflow-hidden">
                                      {/* Weekday / Saturday / Sunday tabs */}
                                      <div className="flex border-b border-border">
                                        {(["weekday", "saturday", "sunday"] as DayTab[]).map(tab => (
                                          <button
                                            key={tab}
                                            onClick={() => setTimetableTab(prev => ({ ...prev, [key]: tab }))}
                                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                              activeTab === tab
                                                ? "bg-blue-600 text-white"
                                                : "text-text-secondary hover:text-text-primary"
                                            }`}
                                          >
                                            {t(tab)}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Grouped by hour */}
                                      <div className="p-4 max-h-64 overflow-y-auto space-y-3">
                                        {!ttData ? (
                                          <div className="flex items-center justify-center py-4 text-text-secondary text-xs gap-2">
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />{t("loadingSchedule")}
                                          </div>
                                        ) : Object.keys(hourGroups).length === 0 ? (
                                          <p className="text-xs text-text-secondary text-center py-4">{t("noSchedule")}</p>
                                        ) : (
                                          Object.entries(hourGroups)
                                            .sort(([a], [b]) => {
                                              let hrA = Number(a);
                                              let hrB = Number(b);
                                              if (hrA < 3) hrA += 24;
                                              if (hrB < 3) hrB += 24;
                                              return hrA - hrB;
                                            })
                                            .map(([hourStr, hourTimes]) => {
                                              const hour = Number(hourStr);
                                              const ampm = hour >= 12 ? "PM" : "AM";
                                              const displayH = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                              const currentDay = getDayType(now);
                                              const isPastHour = activeTab === currentDay && hour < now.getHours() && hour >= 3;

                                              const intervals = hourTimes.length > 1
                                                ? hourTimes.slice(1).map((t, i) => timeStrToTotalMins(t) - timeStrToTotalMins(hourTimes[i]))
                                                : [];
                                              const avgInterval = intervals.length > 0
                                                ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
                                                : null;

                                              return (
                                                <div key={hour}>
                                                  <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isPastHour ? "text-text-secondary/40" : "text-text-secondary"}`}>
                                                      {displayH} {ampm}
                                                    </span>
                                                    {avgInterval && (
                                                      <span className={`text-[9px] ${isPastHour ? "text-text-secondary/30" : "text-text-secondary/60"}`}>
                                                        {t("everyMin") !== "everyMin" ? t("everyMin").replace("{count}", String(avgInterval)) : `— every ${avgInterval} min`}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {hourTimes.map((t) => {
                                                      const tMins = timeStrToTotalMins(t);
                                                      const isPast = activeTab === currentDay && (
                                                        (tMins < currentTotalMins && tMins >= 180) || 
                                                        (tMins < currentTotalMins && currentTotalMins < 180)
                                                      );
                                                      const nextIdx = hourTimes.findIndex(tt => timeStrToTotalMins(tt) >= currentTotalMins);
                                                      const isNextTrain = activeTab === currentDay && hour === now.getHours() && hourTimes.indexOf(t) === nextIdx;
                                                      return (
                                                        <span
                                                          key={t}
                                                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border select-none ${
                                                            isNextTrain
                                                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold"
                                                              : isPast
                                                              ? "border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500"
                                                              : "border-border/60 bg-card text-text-primary"
                                                          }`}
                                                        >
                                                          {t}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            })
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 pb-6 flex-shrink-0">
        <Footer />
      </div>

      {/* ── Directory Image Modal ── */}
      {directoryModalOpen && directoryUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setDirectoryModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full h-[80vh] max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-card"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-card border-b border-border/60 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Map className="h-3.5 w-3.5 text-text-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{tStation(decodedName)} — {t("stationDirectory")}</span>
              </div>
              
              {/* Zoom controls */}
              <div className="flex items-center gap-2 mr-8">
                <button
                  onClick={() => setZoomScale(s => Math.max(s - 0.25, 1.0))}
                  className="p-1.5 rounded-lg border border-border bg-button-secondary/50 text-text-secondary hover:text-text-primary hover:bg-button-secondary transition-all active:scale-90"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-text-primary min-w-[36px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomScale(s => Math.min(s + 0.25, 3.0))}
                  className="p-1.5 rounded-lg border border-border bg-button-secondary/50 text-text-secondary hover:text-text-primary hover:bg-button-secondary transition-all active:scale-90"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-lg border border-border bg-button-secondary/50 text-text-secondary hover:text-text-primary hover:bg-button-secondary transition-all active:scale-90"
                  title="Reset Zoom"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setDirectoryModalOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors shadow-lg"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image */}
            <div
              ref={imgContainerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUpOrLeave}
              className={`overflow-auto flex-1 bg-card p-4 text-center select-none ${
                zoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              }`}
            >
              <img
                src={directoryUrl}
                alt={`${decodedName} station directory`}
                className="transition-all duration-200 ease-out inline-block pointer-events-none"
                style={{
                  width: `${zoomScale * 100}%`,
                  maxWidth: zoomScale > 1 ? "none" : "100%",
                  height: "auto",
                  maxHeight: zoomScale > 1 ? "none" : "75vh",
                  objectFit: "contain"
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
