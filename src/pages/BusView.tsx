import React, { useState, useEffect, useMemo } from "react";
import { decodeVehiclePositions } from "../lib/bus-decoder";
import type { DecodedVehicle } from "../lib/bus-decoder";
import { SvgBusMap } from "../components/bus/SvgBusMap";
import { RefreshCw, CheckSquare, Square, EyeOff, LayoutList, Check, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StaticRoute {
  id: string;
  name: string;
  desc: string;
}

const STATIC_ROUTES: Record<"johor" | "melaka", StaticRoute[]> = {
  johor: [
    { id: "J10", name: "J10", desc: "JB Sentral - Kota Tinggi" },
    { id: "J11", name: "J11", desc: "JB Sentral - AEON Dato' Onn" },
    { id: "J13", name: "J13", desc: "JB Sentral - Larkin Sentral" },
    { id: "J15", name: "J15", desc: "JB Sentral - Mid Valley Southkey" },
    { id: "J16", name: "J16", desc: "Angsana - Toppen Tebrau" },
    { id: "J20", name: "J20", desc: "JB Sentral - Masai" },
    { id: "J21", name: "J21", desc: "JB Sentral - Permas Jaya" },
    { id: "J22", name: "J22", desc: "JB Sentral - Scientex" },
    { id: "J30", name: "J30", desc: "JB Sentral - Kulai" },
    { id: "J31", name: "J31", desc: "JB Sentral - Pulai Mutiara" },
    { id: "J32", name: "J32", desc: "JB Sentral - Selesa Jaya" },
    { id: "J33", name: "J33", desc: "JB Sentral - Sri Yaacob" },
    { id: "J34", name: "J34", desc: "JB Sentral - Sutera Mall" },
    { id: "J40", name: "J40", desc: "Larkin Sentral - Gelang Patah" },
    { id: "J42", name: "J42", desc: "Gelang Patah - Pendas" },
    { id: "J44", name: "J44", desc: "Larkin Sentral - Puteri Harbour" },
    { id: "J50", name: "J50", desc: "Larkin Sentral - Pontian" },
    { id: "J100", name: "J100", desc: "JB Sentral - KSL City Mall" },
    { id: "J200", name: "J200", desc: "Terminal Masai - PPR Seri Alam" },
    { id: "J205", name: "J205", desc: "Terminal Masai - Lotus Kota Masai" },
    { id: "J300", name: "J300", desc: "Terminal Kulai - Putri Kulai" },
  ],
  melaka: [
    { id: "M10A", name: "M10A", desc: "Melaka Sentral - MITC & UTeM" },
    { id: "M10B", name: "M10B", desc: "Melaka Sentral - MITC" },
    { id: "M11", name: "M11", desc: "Melaka Sentral - Bukit Katil" },
    { id: "M12", name: "M12", desc: "Melaka Sentral - Airport Batu Berendam" },
    { id: "M13", name: "M13", desc: "Melaka Sentral - Taman Inang Sari" },
    { id: "M14", name: "M14", desc: "Melaka Sentral - Bertam Ulu" },
    { id: "M15", name: "M15", desc: "Melaka Sentral - Pulau Gadong" },
    { id: "M16", name: "M16", desc: "Melaka Sentral - Paya Luboh" },
    { id: "M17", name: "M17", desc: "Melaka Sentral - Tangga Batu" },
    { id: "M20", name: "M20", desc: "Melaka Sentral - Tampin" },
    { id: "M20X", name: "M20X", desc: "Melaka Sentral - Alor Gajah" },
    { id: "M21", name: "M21", desc: "Melaka Sentral - Tampin via Durian Tunggal" },
    { id: "M21X", name: "M21X", desc: "Melaka Sentral - Alor Gajah via Durian Tunggal" },
    { id: "M22", name: "M22", desc: "Melaka Sentral - Bandar Vendor" },
    { id: "M23", name: "M23", desc: "Melaka Sentral - Masjid Tanah" },
    { id: "M23X", name: "M23X", desc: "Melaka Sentral - Masjid Tanah" },
    { id: "M30", name: "M30", desc: "Melaka Sentral - Batang Melaka via Selandar" },
    { id: "M31", name: "M31", desc: "Melaka Sentral - Batang Melaka via Tebong" },
    { id: "M32", name: "M32", desc: "Melaka Sentral - Jasin" },
    { id: "M33", name: "M33", desc: "Jasin - Taman Seri Asahan" },
    { id: "M100", name: "M100", desc: "Bandaraya Melaka Feeder" },
    { id: "M101", name: "M101", desc: "Pasar Melaka Feeder" },
  ],
};

const REGION_CONFIGS = {
  johor: {
    url: "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor/",
  },
  melaka: {
    url: "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-melaka/",
  },
};

export const BusView: React.FC = () => {
  const [region, setRegion] = useState<"johor" | "melaka">("johor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState("Initializing tracker...");
  const [buses, setBuses] = useState<DecodedVehicle[]>([]);
  const [hideInactive, setHideInactive] = useState(true);
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());

  // Generate dynamic, harmonized color palette for route ids
  const selectedRouteColors = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {};
    const allRoutes = STATIC_ROUTES[region];
    allRoutes.forEach((r, idx) => {
      const h = (idx * (360 / allRoutes.length)) % 360;
      colors[r.id] = `hsl(${h}, 85%, 50%)`;
    });
    return colors;
  }, [region]);

  const cleanName = (routeId: string) => {
    return routeId.replace(/CWLMYJB|MYJB|JB|CWLMYMK|MYMK|MK/g, "").trim();
  };

  // Compile active bus count per route
  const activeBusCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    buses.forEach((b) => {
      const id = cleanName(b.routeId);
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [buses]);

  // Fetch myBAS Live position positions
  const fetchPositions = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setStatusText("Refreshing live locations...");

    try {
      const res = await fetch(REGION_CONFIGS[region].url);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const buffer = await res.arrayBuffer();

      const list = decodeVehiclePositions(new Uint8Array(buffer));
      setBuses(list);

      // Initialize selected routes if empty
      setSelectedRouteIds((prev) => {
        if (prev.size === 0) {
          const fresh = new Set<string>();
          STATIC_ROUTES[region].forEach((r) => fresh.add(r.id));
          return fresh;
        }
        return prev;
      });

      setStatusText(`Found ${list.length} active buses across ${STATIC_ROUTES[region].length} routes.`);
    } catch (err: any) {
      console.error(err);
      setStatusText("Failed to refresh live positions. Retrying shortly...");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Reset selections on region switch
    setSelectedRouteIds(new Set());
    setBuses([]);
    fetchPositions();

    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, [region]);

  const toggleRoute = (routeId: string) => {
    setSelectedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    STATIC_ROUTES[region].forEach((r) => all.add(r.id));
    setSelectedRouteIds(all);
  };

  const deselectAll = () => {
    setSelectedRouteIds(new Set());
  };

  const visibleRoutes = useMemo(() => {
    let list = STATIC_ROUTES[region];
    if (hideInactive) {
      list = list.filter((r) => (activeBusCounts[r.id] || 0) > 0);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [region, hideInactive, activeBusCounts]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* Search Bus / Show Tracker Floating Button - Mobile only */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-2.5 text-xs font-bold shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <LayoutList className="h-4 w-4" />
          Show Tracker
        </button>
      )}

      {/* Sidebar Selector Form */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute md:relative inset-y-0 left-0 w-[300px] md:w-[320px] z-20 flex-shrink-0 p-4 border-r border-border/80 bg-slate-900/95 dark:bg-slate-950/85 backdrop-blur-md overflow-hidden flex flex-col gap-4 shadow-2xl md:shadow-none"
          >
            {/* Header Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  myBAS Live Tracker
                </h2>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[8px] font-extrabold px-1 rounded select-none animate-pulse-soft">
                  LIVE
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-[10px] font-bold text-slate-500 hover:text-white"
              >
                Hide
              </button>
            </div>

            {/* Region Selector tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-0.5 border border-white/10 flex-shrink-0">
              {(["johor", "melaka"] as const).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setRegion(reg)}
                  className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    region === reg
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>

            {/* Live Counts Status label */}
            <div className="text-[10px] text-text-secondary leading-relaxed bg-white/5 border border-white/10 rounded-xl p-2.5 flex-shrink-0 flex items-center justify-between">
              <span>{statusText}</span>
              <button
                onClick={fetchPositions}
                disabled={isRefreshing}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Control buttons */}
            <div className="space-y-2 flex-shrink-0">
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                <button onClick={selectAll} className="hover:text-white flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select All
                </button>
                <button onClick={deselectAll} className="hover:text-white flex items-center gap-1">
                  <Square className="h-3.5 w-3.5" />
                  Deselect All
                </button>
              </div>

              {/* Hide Inactive */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={hideInactive}
                  onChange={(e) => setHideInactive(e.target.checked)}
                  className="rounded bg-slate-950 border-white/15 text-blue-500 focus:ring-0"
                />
                Hide Inactive Routes
              </label>
            </div>

            {/* Routes list wrapper */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {visibleRoutes.map((route) => {
                const count = activeBusCounts[route.id] || 0;
                const isSelected = selectedRouteIds.has(route.id);
                const color = selectedRouteColors[route.id];

                return (
                  <button
                    key={route.id}
                    onClick={() => toggleRoute(route.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "border-white/10 bg-white/5"
                        : "border-transparent bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-4 w-4 rounded-lg flex-shrink-0 border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-white/10 bg-slate-950"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        style={{ backgroundColor: color }}
                        className="text-[9px] font-extrabold text-white px-2 py-0.5 rounded shadow-md uppercase tracking-wide flex-shrink-0"
                      >
                        {route.name}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium truncate">
                        {route.desc}
                      </span>
                    </div>
                    {count > 0 && (
                      <span className="text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/25 px-1.5 py-0.5 rounded-full select-none">
                        {count} live
                      </span>
                    )}
                  </button>
                );
              })}

              {visibleRoutes.length === 0 && (
                <div className="h-[120px] flex flex-col items-center justify-center text-center text-slate-600">
                  <EyeOff className="h-8 w-8 mb-2 animate-pulse" />
                  <p className="text-xs">No active routes matching filters.</p>
                </div>
              )}
            </div>

            {/* Sidebar toggle back to map */}
            <div className="mt-auto border-t border-white/5 pt-3 flex-shrink-0">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-slate-950 text-slate-300 font-semibold text-xs hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Map className="h-4 w-4" />
                Hide Sidebar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Map Content - Fills available view */}
      <div className="flex-1 h-full p-4 relative overflow-hidden bg-slate-900">
        {/* Floating Sidebar Toggle Button (if closed) - Desktop only */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute top-4 left-4 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-2.5 text-xs font-bold shadow-2xl items-center gap-1.5 active:scale-95 transition-all"
          >
            <LayoutList className="h-4 w-4" />
            Show Tracker Sidebar
          </button>
        )}

        {/* Live SVG Vector Map Overlay */}
        <SvgBusMap
          region={region}
          buses={buses}
          selectedRouteColors={selectedRouteColors}
          selectedRouteIds={selectedRouteIds}
        />
      </div>
    </div>
  );
};
