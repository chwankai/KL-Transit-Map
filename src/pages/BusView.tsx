import React, { useState, useEffect, useMemo, useCallback } from "react";
import { decodeVehiclePositions } from "../lib/bus-decoder";
import type { DecodedVehicle } from "../lib/bus-decoder";
import { LeafletBusMap } from "../components/bus/LeafletBusMap";
import type { RapidBusRoute, BusRouteStop } from "../components/bus/LeafletBusMap";
import {
  RefreshCw, Search, ChevronRight, X, ArrowLeft, Bus as BusIcon,
  Map as MapIcon, List as ListIcon, MapPin, Layers
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { trackEvent } from "../lib/analytics";

export const BusView: React.FC = () => {
  const { t } = useSettings();

  const [routes, setRoutes] = useState<RapidBusRoute[]>([]);
  const [buses, setBuses] = useState<DecodedVehicle[]>([]);
  const [isRefreshingBuses, setIsRefreshingBuses] = useState(false);

  // Filters & Selected State
  const [categoryFilter, setCategoryFilter] = useState<"all" | "trunk" | "feeder">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RapidBusRoute | null>(null);
  const [focusedStop, setFocusedStop] = useState<BusRouteStop | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

  // 1. Fetch static RapidKL bus catalog
  useEffect(() => {
    fetch("/rapid_bus_data.json")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.routes) {
          setRoutes(data.routes);
        }
      })
      .catch((err) => {
        console.warn("Failed to load RapidKL bus catalog:", err);
      });
  }, []);

  // 2. Fetch live realtime bus positions from data.gov.my
  const fetchLiveBuses = useCallback(async () => {
    setIsRefreshingBuses(true);
    try {
      const endpoints = [
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl",
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-mrtfeeder",
      ];

      const responses = await Promise.allSettled(
        endpoints.map(async (url) => {
          const res = await fetch(url, { headers: { Accept: "application/x-protobuf" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          return decodeVehiclePositions(new Uint8Array(buffer));
        })
      );

      const allVehicles: DecodedVehicle[] = [];
      responses.forEach((result) => {
        if (result.status === "fulfilled") {
          allVehicles.push(...result.value);
        }
      });

      setBuses(allVehicles);
    } catch (e) {
      console.warn("Realtime bus fetch failed:", e);
    } finally {
      setIsRefreshingBuses(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchLiveBuses();
    const interval = setInterval(fetchLiveBuses, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveBuses]);

  // 3. Map route ID -> color lookup
  const routeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    routes.forEach((r) => {
      map[r.id] = r.color;
      map[r.name] = r.color;
    });
    return map;
  }, [routes]);

  // 4. Calculate live bus count per route
  const activeBusesByRoute = useMemo(() => {
    const counts: Record<string, DecodedVehicle[]> = {};
    buses.forEach((b) => {
      const cleanRouteId = b.routeId
        .replace(/^U([0-9]+)0$/, "$1")
        .replace(/^T([0-9]+)0$/, "T$1")
        .replace(/^U/, "");

      // Match by exact id or clean short name
      const matched = routes.find(
        (r) => r.id === b.routeId || r.name.toUpperCase() === cleanRouteId.toUpperCase()
      );

      const key = matched ? matched.id : b.routeId;
      if (!counts[key]) counts[key] = [];
      counts[key].push(b);
    });
    return counts;
  }, [buses, routes]);

  // Total active routes count
  const activeRouteCount = Object.keys(activeBusesByRoute).length;

  // 5. Filter routes list
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routes.filter((r) => {
      // Category filter
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.dest.toLowerCase().includes(q) ||
        r.stops.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [routes, categoryFilter, searchQuery]);

  // Selected route's live vehicles
  const selectedRouteBuses = selectedRoute
    ? activeBusesByRoute[selectedRoute.id] || []
    : [];

  const handleSelectCategory = (cat: "all" | "trunk" | "feeder") => {
    setCategoryFilter(cat);
    setSelectedRoute(null);
    setFocusedStop(null);
    trackEvent("filter_bus_category", "bus", cat);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (selectedRoute) {
      setSelectedRoute(null);
      setFocusedStop(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-background text-text-primary relative animate-fade-in">
      {/* ── Left Sidebar (Desktop) / Sliding Panel (Mobile) ── */}
      <div
        className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border bg-sidebar/95 backdrop-blur-md md:backdrop-blur-none z-30 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
          mobileTab === "list" ? "flex h-full" : "hidden md:flex"
        }`}
      >
        {/* Top Header Card */}
        <div className="p-4 border-b border-border/80 space-y-3 flex-shrink-0 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500 shadow-inner">
                <BusIcon className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-text-primary">
                  {t("rapidKlBuses")}
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {buses.length} {t("live")} • {activeRouteCount} routes
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Toggle All Lines Button */}
              <button
                onClick={() => {
                  setShowAllRoutes((prev) => !prev);
                  trackEvent("toggle_all_bus_lines", "bus", String(!showAllRoutes));
                }}
                className={`p-2 rounded-xl border transition-all active:scale-90 shadow-sm ${
                  showAllRoutes
                    ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                    : "border-border bg-card text-text-secondary hover:text-text-primary hover:border-blue-500"
                }`}
                title={showAllRoutes ? t("hideAllLines") : t("showAllLines")}
              >
                <Layers className="h-4 w-4" />
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchLiveBuses();
                  trackEvent("manual_refresh_buses", "bus");
                }}
                disabled={isRefreshingBuses}
                className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary hover:border-blue-500 transition-all active:scale-90 shadow-sm"
                title="Refresh Live Buses"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingBuses ? "animate-spin text-blue-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("searchBusPlaceholder")}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-text-secondary/60 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-text-secondary hover:text-text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5">
            {(
              [
                { key: "all", labelKey: "allRoutes" },
                { key: "trunk", labelKey: "trunkRoutes" },
                { key: "feeder", labelKey: "feederRoutes" },
              ] as const
            ).map(({ key, labelKey }) => {
              const active = categoryFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectCategory(key)}
                  className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all text-center whitespace-nowrap leading-none ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-card border border-border text-text-secondary hover:text-text-primary hover:bg-button-secondary"
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Content: Route Detail View OR Route List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selectedRoute ? (
            /* ── Selected Route Detail Drawer ── */
            <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3.5 animate-fade-in overflow-hidden">
              {/* Back to List Button */}
              <button
                onClick={() => {
                  setSelectedRoute(null);
                  setFocusedStop(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("allRoutes")}</span>
              </button>

              {/* Route Summary Card */}
              <div className="glass-panel rounded-2xl p-3.5 border border-border bg-card shadow-md space-y-2.5 flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: selectedRoute.color }}
                      className="px-2.5 py-1 rounded-lg text-sm font-black text-white shadow-sm"
                    >
                      {selectedRoute.name}
                    </span>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        {selectedRoute.category === "feeder" ? t("feederRoutes") : t("trunkRoutes")}
                      </div>
                      <div className="text-xs font-bold text-text-primary leading-tight mt-0.5">
                        {selectedRoute.desc}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <span className="text-text-secondary">
                    {selectedRoute.stopCount} {t("stopsCount").replace("{count}", "")}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      selectedRouteBuses.length > 0
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-button-secondary text-text-secondary"
                    }`}
                  >
                    {selectedRouteBuses.length} {t("live")}
                  </span>
                </div>
              </div>

              {/* Live Buses Active on Route */}
              {selectedRouteBuses.length > 0 && (
                <div className="space-y-1.5 flex-shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t("activeBusesOnRoute").replace("{count}", String(selectedRouteBuses.length))}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRouteBuses.map((b) => (
                      <div
                        key={b.vehicleId}
                        className="rounded-xl border border-border bg-card p-2 text-xs space-y-0.5 shadow-sm"
                      >
                        <div className="font-bold text-text-primary flex items-center justify-between">
                          <span>{b.licensePlate}</span>
                          <span className="text-[9px] text-emerald-500 font-extrabold">LIVE</span>
                        </div>
                        <div className="text-[10px] text-text-secondary">
                          {b.speed} km/h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stops List (Expanded to the bottom of the screen with straight dividers) */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between flex-shrink-0">
                  <span>{t("busStops")} ({selectedRoute.stops.length})</span>
                  <span className="text-[9px] font-normal text-text-secondary/70">Tap stop to locate</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/60 -mx-4 border-t border-b border-border/60">
                  {selectedRoute.stops.map((stop, idx) => {
                    const isFocused = focusedStop?.id === stop.id;
                    return (
                      <button
                        key={`${stop.id}_${idx}`}
                        onClick={() => {
                          setFocusedStop(stop);
                          setMobileTab("map");
                        }}
                        className={`w-full flex items-center justify-between gap-3 py-2.5 px-4 text-xs transition-colors text-left group ${
                          isFocused
                            ? "bg-blue-600/10 text-blue-500 font-bold dark:bg-blue-950/40 dark:text-blue-400"
                            : "hover:bg-button-secondary/60 text-text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`w-5 text-center text-[10.5px] font-mono font-extrabold shrink-0 ${
                              isFocused
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-text-secondary"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate leading-tight font-medium">
                            {stop.name}
                          </span>
                        </div>
                        <MapPin className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isFocused ? "text-blue-500 dark:text-blue-400 opacity-100" : "opacity-0 group-hover:opacity-60 text-text-secondary"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ── Route List ── */
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {filteredRoutes.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-xs">
                  {t("noRoutesMatched")}
                </div>
              ) : (
                filteredRoutes.map((r) => {
                  const liveCount = activeBusesByRoute[r.id]?.length || 0;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRoute(r);
                        setFocusedStop(null);
                        setMobileTab("map");
                        trackEvent("select_bus_route", "bus", r.name);
                      }}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-button-secondary/50 transition-colors border-b border-border/50 last:border-b-0 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          style={{ backgroundColor: r.color }}
                          className="px-2 py-0.5 rounded-md text-xs font-extrabold text-white shrink-0 shadow-sm leading-none"
                        >
                          {r.name}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-text-primary truncate leading-tight">
                            {r.desc}
                          </div>
                          <div className="text-[10px] text-text-secondary font-medium mt-0.5">
                            {r.stopCount} {t("stopsCount").replace("{count}", "")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {liveCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                            {liveCount} {t("live")}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-text-primary transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right / Main Map View (Leaflet) ── */}
      <div className={`flex-1 relative w-full h-full overflow-hidden ${mobileTab === "map" ? "block h-full" : "hidden md:block"}`}>
        <LeafletBusMap
          buses={buses}
          allRoutes={routes}
          showAllRoutes={showAllRoutes}
          onToggleShowAllRoutes={() => {
            setShowAllRoutes((prev) => !prev);
            trackEvent("toggle_all_bus_lines", "bus", String(!showAllRoutes));
          }}
          selectedRoute={selectedRoute}
          focusedStop={focusedStop}
          onSelectRoute={(route) => {
            setSelectedRoute(route);
            setFocusedStop(null);
            trackEvent("select_bus_route_from_map", "bus", route.name);
          }}
          onClearSelectedRoute={() => {
            setSelectedRoute(null);
            setFocusedStop(null);
          }}
          routeColorMap={routeColorMap}
        />
      </div>

      {/* Mobile Floating Tab Switcher (List <-> Map) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setMobileTab((prev) => (prev === "map" ? "list" : "map"))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs shadow-2xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          {mobileTab === "map" ? (
            <>
              <ListIcon className="h-4 w-4" />
              <span>{selectedRoute ? selectedRoute.name : t("allRoutes")}</span>
            </>
          ) : (
            <>
              <MapIcon className="h-4 w-4" />
              <span>{t("map")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
