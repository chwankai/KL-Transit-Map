import React, { useState, useEffect, useRef } from "react";
import { stations, lines, findRoute } from "../lib/transit-data";
import type { Route } from "../lib/transit-data";
import { fetchMyRapidRoute, getCurrentDateTime, subtractSecondsFromDatetime, geocodeStation, fetchSingleRoute } from "../lib/routing";
import { useSettings } from "../context/SettingsContext";
import { Footer } from "../components/layout/Footer";
import { ArrowUpDown, Search, Compass, RefreshCw, Clock, ChevronDown, ChevronUp, AlertCircle, X, Heart, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const PlanView: React.FC = () => {
  const { farePref } = useSettings();
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [timeMode, setTimeMode] = useState<"now" | "depart" | "arrive">("now");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  const [originInputFocused, setOriginInputFocused] = useState(false);
  const [destInputFocused, setDestInputFocused] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);

  // State to filter suggestions list. Reset to empty on focus so the full list displays.
  const [originFilter, setOriginFilter] = useState("");
  const [destFilter, setDestFilter] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedStops, setExpandedStops] = useState<Record<number, boolean>>({});

  // Keep track of search parameters to prevent unneeded result panel refreshes
  const [searchedOrigin, setSearchedOrigin] = useState("");
  const [searchedDest, setSearchedDest] = useState("");

  // Mobile layout overlay pull down controls
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(true);

  // Local storage saved routes
  const [savedRoutes, setSavedRoutes] = useState<{ origin: string; dest: string }[]>(() => {
    const saved = localStorage.getItem("saved_routes");
    return saved ? JSON.parse(saved) : [];
  });
  const [isJustSaved, setIsJustSaved] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  const sortedStationNames = Object.keys(stations).sort();

  // Initialize date/time inputs
  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setDateInput(`${yyyy}-${mm}-${dd}`);

    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    setTimeInput(`${hh}:${min}`);
  }, []);

  // Update origin/dest autocompletes based on filter values (empty shows full list)
  useEffect(() => {
    if (!originFilter) {
      setOriginSuggestions(sortedStationNames);
    } else {
      const match = sortedStationNames.filter((name) =>
        name.toLowerCase().includes(originFilter.toLowerCase())
      );
      setOriginSuggestions(match);
    }
  }, [originFilter]);

  useEffect(() => {
    if (!destFilter) {
      setDestSuggestions(sortedStationNames);
    } else {
      const match = sortedStationNames.filter((name) =>
        name.toLowerCase().includes(destFilter.toLowerCase())
      );
      setDestSuggestions(match);
    }
  }, [destFilter]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setOriginInputFocused(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestInputFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwap = () => {
    const tmp = origin;
    setOrigin(dest);
    setDest(tmp);
    setOriginFilter("");
    setDestFilter("");
  };

  const handleSearchAgain = () => {
    setOrigin("");
    setDest("");
    setOriginFilter("");
    setDestFilter("");
    setRoutes([]);
    setSearchedOrigin("");
    setSearchedDest("");
    setErrorMsg(null);
    setIsMobileFormOpen(true);
  };

  const handleSaveRoute = () => {
    if (!searchedOrigin || !searchedDest) return;
    const exists = savedRoutes.some(
      (r) =>
        r.origin.toLowerCase() === searchedOrigin.toLowerCase() &&
        r.dest.toLowerCase() === searchedDest.toLowerCase()
    );
    if (!exists) {
      const updated = [...savedRoutes, { origin: searchedOrigin, dest: searchedDest }];
      setSavedRoutes(updated);
      localStorage.setItem("saved_routes", JSON.stringify(updated));
    }
    setIsJustSaved(true);
    setTimeout(() => setIsJustSaved(false), 2000);
  };

  const handleDeleteSavedRoute = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updated = savedRoutes.filter((_, idx) => idx !== index);
    setSavedRoutes(updated);
    localStorage.setItem("saved_routes", JSON.stringify(updated));
  };

  const handleSelectSavedRoute = (saved: { origin: string; dest: string }) => {
    setOrigin(saved.origin);
    setDest(saved.dest);
    setOriginFilter("");
    setDestFilter("");
    setIsMobileFormOpen(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !dest) return;

    if (origin.trim().toLowerCase() === dest.trim().toLowerCase()) {
      const sameStationRoute: Route = {
        path: [origin.trim()],
        edges: [],
        totalDistance: 0,
        totalFare: 0,
        cashFare: 0,
        concessionFare: 0,
        transfers: 0,
        isSameStation: true,
        etaDepart: null,
        etaArrive: null,
        totalDurationSec: 0,
        legMeta: [],
      };
      setRoutes([sameStationRoute]);
      setSelectedRouteIndex(0);
      setSearchedOrigin(origin);
      setSearchedDest(dest);
      setErrorMsg(null);
      setIsMobileFormOpen(false); // Hide form overlay on mobile after search
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setExpandedStops({});

    let targetTime = "";
    if (timeMode !== "now" && dateInput && timeInput) {
      targetTime = `${dateInput} ${timeInput}:00`;
    } else {
      targetTime = getCurrentDateTime();
    }

    try {
      let departureTime = targetTime;

      if (timeMode === "arrive") {
        try {
          const originGeo = await geocodeStation(origin);
          const destGeo = await geocodeStation(dest);
          const flng = originGeo.geometry.coordinates[0];
          const flat = originGeo.geometry.coordinates[1];
          const tlng = destGeo.geometry.coordinates[0];
          const tlat = destGeo.geometry.coordinates[1];
          const probeRoutes = await fetchSingleRoute(flng, flat, tlng, tlat, "fastest", targetTime);
          if (probeRoutes && probeRoutes.length > 0 && probeRoutes[0].totalDurationSec) {
            departureTime = subtractSecondsFromDatetime(targetTime, probeRoutes[0].totalDurationSec);
          }
        } catch (e) {
          console.warn("Arrive-by estimation failed, falling back:", e);
        }
      }

      const results = await fetchMyRapidRoute(origin, dest, departureTime);
      setRoutes(results);
      setSelectedRouteIndex(0);
      setSearchedOrigin(origin);
      setSearchedDest(dest);
      setIsMobileFormOpen(false); // Hide form overlay on mobile after search
    } catch (err: any) {
      console.warn("RapidKL API failed, falling back to local Dijkstra:", err);
      const localRoute = findRoute(origin, dest, []);
      if (localRoute) {
        // Estimate duration: ~2 min per stop
        const stopCount = localRoute.path.length;
        localRoute.totalDurationSec = stopCount * 120;
        localRoute._routeLabel = "Best";
        
        // Generate mock schedule times
        const formatTime = (d: Date) => {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          return `${hh}:${mm}`;
        };
        const dt = new Date(targetTime.replace(/-/g, "/"));
        localRoute.etaDepart = formatTime(dt);
        const arrDt = new Date(dt.getTime() + localRoute.totalDurationSec * 1000);
        localRoute.etaArrive = formatTime(arrDt);

        setRoutes([localRoute]);
        setSelectedRouteIndex(0);
        setSearchedOrigin(origin);
        setSearchedDest(dest);
        setIsMobileFormOpen(false); // Hide form overlay on mobile after search
      } else {
        setErrorMsg("No route found between selected stations.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLineColor = (lineId: string) => {
    return lines[lineId]?.color || "#6b7280";
  };

  const getLineName = (lineId: string) => {
    return lines[lineId]?.name || lineId;
  };

  const getStationBadges = (stationName: string) => {
    const node = stations[stationName];
    if (!node || !node.codes) return null;
    return (
      <div className="flex gap-1 flex-wrap">
        {node.codes.map((code) => {
          const match = code.match(/^[a-zA-Z]+/);
          let lineId = match ? match[0] : "";
          if (lineId === "SB") {
            lineId = "BRT";
          }
          const color = getLineColor(lineId);
          return (
            <span
              key={code}
              style={{ backgroundColor: color }}
              className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded shadow-sm animate-fade-in"
            >
              {code}
            </span>
          );
        })}
      </div>
    );
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  };

  const activeRoute = routes[selectedRouteIndex];
  const isWalkOnly = activeRoute && activeRoute.edges.length > 0 && activeRoute.edges.every(e => e.line === "WALKWAY");

  // Helper to compile steps for rendering timeline
  const getRouteSegments = (route: Route) => {
    const segments: { line: string; stations: string[] }[] = [];
    let currentLine: string | null = null;
    let lineSegments: string[] = [];

    route.edges.forEach((edge) => {
      if (edge.line !== currentLine) {
        if (currentLine) {
          segments.push({ line: currentLine, stations: lineSegments });
        }
        currentLine = edge.line;
        lineSegments = [];
      }
      lineSegments.push(edge.to);
    });

    if (currentLine && lineSegments.length > 0) {
      segments.push({ line: currentLine, stations: lineSegments });
    }

    return segments;
  };

  const segments = activeRoute ? getRouteSegments(activeRoute) : [];

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-background text-text-primary relative animate-fade-in">
      {/* Sidebar Selector Form */}
      <div
        className={`w-full md:w-[360px] flex-shrink-0 p-5 md:border-r border-border overflow-y-auto bg-sidebar/95 backdrop-blur-md md:backdrop-blur-none z-30 transition-all duration-300 flex flex-col justify-between gap-4 ${
          routes.length > 0
            ? isMobileFormOpen
              ? "absolute inset-x-0 top-0 max-h-[90%] shadow-2xl border-b border-border md:relative md:inset-auto md:max-h-none md:shadow-none md:border-r animate-in slide-in-from-top duration-200"
              : "hidden md:flex"
            : "flex"
        }`}
      >
        <div className="space-y-4">
          {/* Find Route Card */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl overflow-visible relative z-20">
            <div className="flex justify-between items-center mb-3 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-blue-500" />
                Find Route
              </h3>
              {routes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsMobileFormOpen(false)}
                  className="md:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-button-secondary transition-all"
                  title="Close Form"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              {/* Origin */}
              <div ref={originRef} className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Origin Station
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      setOriginFilter(e.target.value);
                    }}
                    onFocus={() => {
                      setOriginInputFocused(true);
                      setOriginFilter("");
                    }}
                    placeholder="Type station name..."
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-border bg-input text-sm text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {origin && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrigin("");
                        setOriginFilter("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 rounded-full hover:bg-button-secondary transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {originInputFocused && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card dark:bg-slate-900 shadow-2xl opacity-100">
                    {originSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setOrigin(name);
                          setOriginFilter("");
                          setOriginInputFocused(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs text-text-primary hover:bg-button-secondary transition-colors border-b border-slate-200 dark:border-slate-800 last:border-b-0"
                      >
                        {name}
                        {getStationBadges(name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-2.5">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="rounded-full border border-border bg-card p-2 text-text-secondary hover:border-blue-500 hover:text-blue-500 transition-all hover:scale-110 active:scale-95 shadow-sm"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>

              {/* Destination */}
              <div ref={destRef} className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Destination Station
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={dest}
                    onChange={(e) => {
                      setDest(e.target.value);
                      setDestFilter(e.target.value);
                    }}
                    onFocus={() => {
                      setDestInputFocused(true);
                      setDestFilter("");
                    }}
                    placeholder="Type station name..."
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-border bg-input text-sm text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {dest && (
                    <button
                      type="button"
                      onClick={() => {
                        setDest("");
                        setDestFilter("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 rounded-full hover:bg-button-secondary transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {destInputFocused && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card dark:bg-slate-900 shadow-2xl opacity-100">
                    {destSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setDest(name);
                          setDestFilter("");
                          setDestInputFocused(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs text-text-primary hover:bg-button-secondary transition-colors border-b border-slate-200 dark:border-slate-800 last:border-b-0"
                      >
                        {name}
                        {getStationBadges(name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time mode selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Time
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-button-secondary p-0.5 border border-border">
                  {(["now", "depart", "arrive"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTimeMode(mode)}
                      className={`py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold capitalize transition-all ${
                        timeMode === mode
                          ? "bg-blue-600 text-white shadow-md font-bold"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {mode === "now" ? "Now" : mode === "depart" ? "Depart" : "Arrive"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date/Time pickers */}
              {timeMode !== "now" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-2"
                >
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none"
                  />
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none"
                  />
                </motion.div>
              )}

              {/* Form actions row */}
              <button
                type="submit"
                disabled={isLoading || !origin || !dest}
                className="w-full py-3 rounded-xl bg-blue-600 font-bold text-xs tracking-wider uppercase text-white hover:bg-blue-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Journey
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Routes Card */}
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl flex flex-col overflow-hidden max-h-[300px] relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5 select-none">
              <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
              Saved Journeys
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {savedRoutes.length === 0 ? (
                <div className="text-[10px] text-text-secondary italic text-center py-4">
                  No saved journeys yet. Search and save your favorite routes!
                </div>
              ) : (
                savedRoutes.map((route, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSavedRoute(route)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-input hover:bg-button-secondary/65 cursor-pointer transition-all hover:scale-[1.01] active:scale-98"
                  >
                    <div className="flex flex-col text-left max-w-[80%]">
                      <span className="text-[10px] font-bold text-text-primary truncate">{route.origin}</span>
                      <span className="text-[9px] text-text-secondary truncate">to {route.dest}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedRoute(e, idx)}
                      className="p-1 rounded-lg text-text-secondary hover:bg-red-500/15 hover:text-red-500 transition-colors"
                      title="Delete Saved Route"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Results / Detailed Column */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col justify-between h-full bg-results">
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs font-semibold">{errorMsg}</span>
              </motion.div>
            )}

            {!routes.length && !isLoading && !errorMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden md:flex h-[300px] flex-col items-center justify-center text-center text-text-secondary border border-dashed border-border rounded-2xl p-6"
              >
                <Compass className="h-12 w-12 text-slate-500 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-text-primary">Plan a Journey</h3>
                <p className="text-xs max-w-xs mt-1 leading-relaxed text-text-secondary">
                  Select your origin and destination stations on the left panel, and find your fastest route.
                </p>
              </motion.div>
            )}

            {routes.length > 0 && (
              <motion.div
                key={searchedOrigin + searchedDest}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Route Recommendation Cards */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Recommended Routes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {routes.map((route, idx) => {
                      const activeLines = [
                        ...new Set(route.edges.filter((e) => e.line !== "WALKWAY").map((e) => e.line)),
                      ];
                      const active = idx === selectedRouteIndex;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedRouteIndex(idx)}
                          className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                            active
                              ? "border-blue-600/65 bg-blue-600/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                              : "border-border bg-card hover:bg-button-secondary/30"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
                            {route._routeLabel || `Option ${idx + 1}`}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 my-2">
                            {activeLines.map((lineId, i) => (
                              <React.Fragment key={lineId}>
                                {i > 0 && <span className="text-[10px] text-text-secondary">→</span>}
                                <span
                                  style={{ backgroundColor: getLineColor(lineId) }}
                                  className="text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded shadow-sm uppercase"
                                >
                                  {lineId}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="mt-auto flex justify-between items-end w-full">
                            <span className="text-xs font-semibold text-text-secondary">
                              {route.transfers === 0 ? "Direct" : `${route.transfers} ${route.transfers === 1 ? "Transfer" : "Transfers"}`}
                            </span>
                            <span className="text-sm font-bold text-text-primary">
                              {formatDuration(route.totalDurationSec) || `${route.totalDistance.toFixed(1)} km`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Route Details Card */}
                {activeRoute && (
                  <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-5">
                    {/* Journey Stats Bar */}
                    <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-button-secondary/50 border border-border rounded-lg px-2.5 py-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                          <span className="text-xs font-bold text-text-primary">
                            {(isWalkOnly || activeRoute.isSameStation)
                              ? "N/A"
                              : (activeRoute.etaDepart && activeRoute.etaArrive
                                ? `${activeRoute.etaDepart} - ${activeRoute.etaArrive}`
                                : "ETA Range")}
                          </span>
                        </div>
                        <span className="text-xs text-text-secondary font-semibold">
                          {formatDuration(activeRoute.totalDurationSec) || "0 mins"} · {activeRoute.totalDistance.toFixed(2)} km · {activeRoute.transfers === 0 ? "Direct" : `${activeRoute.transfers} ${activeRoute.transfers === 1 ? "Transfer" : "Transfers"}`}
                        </span>
                      </div>

                      {/* Fare breakdown */}
                      <div className="grid grid-flow-col auto-cols-fr gap-1 bg-button-secondary/30 p-1 rounded-xl border border-border min-w-[210px]">
                        {/* Cashless */}
                        {(farePref === "all" || farePref === "cashless") && (
                          <div className="px-3 py-1.5 text-center">
                            <div className="text-[9px] font-bold text-text-secondary uppercase tracking-wide">Cashless</div>
                            <div className="text-xs font-extrabold text-text-primary">
                              RM {(isWalkOnly || activeRoute.isSameStation) ? "0.00" : activeRoute.totalFare.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {/* Cash */}
                        {(farePref === "all" || farePref === "cash") && (
                          <div className="px-3 py-1.5 text-center border-l border-border">
                            <div className="text-[9px] font-bold text-text-secondary uppercase tracking-wide">Cash</div>
                            <div className="text-xs font-extrabold text-text-primary">
                              {(isWalkOnly || activeRoute.isSameStation) ? "RM 0.00" : (activeRoute.cashFare ? `RM ${activeRoute.cashFare.toFixed(2)}` : "--")}
                            </div>
                          </div>
                        )}
                        {/* Concession */}
                        {(farePref === "all" || farePref === "concession") && (
                          <div className="px-3 py-1.5 text-center border-l border-border">
                            <div className="text-[9px] font-bold text-text-secondary uppercase tracking-wide">Concession</div>
                            <div className="text-xs font-extrabold text-text-primary">
                              {(isWalkOnly || activeRoute.isSameStation) ? "RM 0.00" : (activeRoute.concessionFare ? `RM ${activeRoute.concessionFare.toFixed(2)}` : "--")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Route Timeline with Line Color Matching */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                        Journey Directions
                      </h3>

                      {activeRoute.isSameStation ? (
                        <div className="relative pl-8 py-2">
                          <span className="absolute left-[2px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600/20 border-2 border-blue-500 z-10" />
                          <div className="text-xs font-bold text-text-primary">
                            You are already at {activeRoute.path[0]}
                          </div>
                          <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
                            No travel is needed because origin and destination are the same station.
                          </p>
                        </div>
                      ) : isWalkOnly ? (
                        <div className="relative pl-8 py-2">
                          <span className="absolute left-[2px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600/20 border-2 border-blue-500 z-10" />
                          <div className="text-xs font-bold text-text-primary">
                            Walkable Interchange Connection
                          </div>
                          <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
                            Both stations are within walkable interchange distance. - You may walk to the {searchedDest} by referring to the signage.
                          </p>
                        </div>
                      ) : (
                        <div className="relative space-y-0 pl-2">
                          {/* Start Node */}
                          <div className="relative pl-8 pb-4">
                            {/* Vertical colored line down to first board point */}
                            <span
                              style={{ backgroundColor: getLineColor(segments[0]?.line) }}
                              className="absolute left-[9px] top-3 bottom-0 w-[2px]"
                            />
                            <span className="absolute left-[2px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-card border-2 border-slate-400 dark:border-slate-500 z-10 animate-pulse-soft" />
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-text-primary">{activeRoute.path[0]}</span>
                              {getStationBadges(activeRoute.path[0])}
                              {activeRoute.etaDepart && (
                                <span className="text-[10px] text-text-secondary font-semibold ml-auto">{activeRoute.etaDepart}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-secondary font-medium mt-0.5">Departing Station</p>
                          </div>

                          {/* Segments & Stops */}
                          {segments.map((seg, idx) => {
                            const isWalk = seg.line === "WALKWAY";
                            const color = getLineColor(seg.line);
                            const isExpanded = expandedStops[idx] || false;
                            const intermediateStops = seg.stations.slice(0, -1);
                            const meta = activeRoute.legMeta?.[idx] || null;

                            return (
                              <React.Fragment key={idx}>
                                {/* Board segment row */}
                                <div className="relative pl-8 pb-4">
                                  {/* Vertical colored line to next step */}
                                  <span
                                    style={{ backgroundColor: color }}
                                    className="absolute left-[9px] top-3 bottom-0 w-[2px]"
                                  />
                                  <span
                                    style={{ borderColor: color, backgroundColor: color }}
                                    className="absolute left-[2px] top-1.5 h-4 w-4 rounded-full border-2 z-10"
                                  />

                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between">
                                      <span style={{ color: isWalk ? "var(--text-secondary)" : color }} className="text-xs font-bold">
                                        {isWalk
                                          ? `Walk to ${seg.stations[seg.stations.length - 1]}`
                                          : `Board ${getLineName(seg.line)}`}
                                        {meta?.direction && (
                                          <span className="text-[10px] text-text-secondary font-normal ml-1.5">
                                            toward {meta.direction}
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    {/* Ride Toggles */}
                                    {!isWalk && intermediateStops.length > 0 ? (
                                      <div className="pl-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedStops((prev) => ({ ...prev, [idx]: !isExpanded }))
                                          }
                                          className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                                        >
                                          Ride {seg.stations.length} stop{seg.stations.length > 1 ? "s" : ""}
                                          {isExpanded ? (
                                            <ChevronUp className="h-3 w-3" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3" />
                                          )}
                                        </button>
                                      </div>
                                    ) : !isWalk ? (
                                      <span className="text-[10px] text-text-secondary pl-2">
                                        Ride 1 stop
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Ride Stops List Expansion (if open) */}
                                <AnimatePresence initial={false}>
                                  {isExpanded && intermediateStops.length > 0 && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: "easeInOut" }}
                                      className="relative pl-8 pb-4 overflow-hidden"
                                    >
                                      {/* Continued vertical segment line */}
                                      <span
                                        style={{ backgroundColor: color }}
                                        className="absolute left-[9px] top-0 bottom-0 w-[2px]"
                                      />
                                      <div className="space-y-2.5 pl-2 border-l border-border/80">
                                        {intermediateStops.map((stop) => (
                                          <div key={stop} className="flex items-center justify-between text-[11px] text-text-secondary">
                                            <div className="flex items-center gap-2">
                                              <span style={{ backgroundColor: color }} className="h-1.5 w-1.5 rounded-full" />
                                              <span>{stop}</span>
                                            </div>
                                            {getStationBadges(stop)}
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Arrival / Transfer Node */}
                                <div className="relative pl-8 pb-4">
                                  {/* Vertical colored line to next step, using NEXT segment line color if available */}
                                  {idx < segments.length - 1 && (
                                    <span
                                      style={{ backgroundColor: getLineColor(segments[idx + 1].line) }}
                                      className="absolute left-[9px] top-3 bottom-0 w-[2px]"
                                    />
                                  )}
                                  <span className="absolute left-[2px] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-card border-2 border-slate-400 dark:border-slate-500 z-10" />
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-text-primary">{seg.stations[seg.stations.length - 1]}</span>
                                    {getStationBadges(seg.stations[seg.stations.length - 1])}
                                    {meta?.arriveTime && (
                                      <span className="text-[10px] text-text-secondary font-semibold ml-auto">{meta.arriveTime}</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-text-secondary font-medium mt-0.5">
                                    {idx === segments.length - 1
                                      ? "Arrive at destination"
                                      : `Transfer to ${getLineName(segments[idx + 1].line)}`}
                                  </p>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mobile View: Search again button inside breakdown card bottom */}
                    <div className="md:hidden pt-2">
                      <button
                        onClick={handleSearchAgain}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs tracking-wider uppercase text-white hover:scale-95 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Search className="h-4 w-4" />
                        Search Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Save This Route Button below the detailed result card */}
                {activeRoute && !activeRoute.isSameStation && !isWalkOnly && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveRoute}
                      disabled={isJustSaved}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 ${
                        isJustSaved
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                          : "border-border bg-card text-text-primary hover:border-red-500/40 hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 text-red-500 ${isJustSaved ? "fill-red-500 animate-pulse" : "hover:fill-red-500"}`} />
                      {isJustSaved ? "Saved!" : "Save this route"}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Non-Sticky Footer (Appears at bottom of results area only) */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
};
