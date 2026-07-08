import React, { useState, useRef, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Hub {
  name: string;
  lat: number;
  lng: number;
}

interface Bus {
  vehicleId: string;
  routeId: string;
  licensePlate: string;
  lat: number;
  lng: number;
  speed: string;
  timestamp: number;
}

interface PlottedBus extends Bus {
  x: number;
  y: number;
  color: string;
  cleanRouteId: string;
}

interface SvgBusMapProps {
  region: "johor" | "melaka";
  buses: Bus[];
  selectedRouteColors: Record<string, string>;
  selectedRouteIds: Set<string>;
}

export const SvgBusMap: React.FC<SvgBusMapProps> = ({
  region,
  buses,
  selectedRouteColors,
  selectedRouteIds,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<PlottedBus | null>(null);

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => {
    if (region === "johor") {
      return {
        minLat: 1.35,
        maxLat: 1.8,
        minLng: 103.3,
        maxLng: 104.05,
      };
    } else {
      return {
        minLat: 2.05,
        maxLat: 2.45,
        minLng: 102.0,
        maxLng: 102.55,
      };
    }
  }, [region]);

  const hubs = useMemo<Hub[]>(() => {
    if (region === "johor") {
      return [
        { name: "JB Sentral", lat: 1.4628, lng: 103.7644 },
        { name: "Larkin Sentral", lat: 1.4958, lng: 103.7414 },
        { name: "Kota Tinggi", lat: 1.7281, lng: 103.8997 },
        { name: "Kulai", lat: 1.6631, lng: 103.5998 },
        { name: "Pontian", lat: 1.4864, lng: 103.3892 },
        { name: "Masai", lat: 1.4883, lng: 103.8847 },
        { name: "Gelang Patah", lat: 1.4489, lng: 103.5933 },
      ];
    } else {
      return [
        { name: "Melaka Sentral", lat: 2.2201, lng: 102.2494 },
        { name: "Alor Gajah", lat: 2.3833, lng: 102.2083 },
        { name: "Jasin", lat: 2.3089, lng: 102.4314 },
        { name: "Masjid Tanah", lat: 2.3017, lng: 102.1092 },
        { name: "Merlimau", lat: 2.1464, lng: 102.4278 },
      ];
    }
  }, [region]);

  const svgWidth = 800;
  const svgHeight = 600;

  // Convert lat/lng to SVG coordinates
  const getCoordinates = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * svgWidth;
    const y = svgHeight - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * svgHeight;
    return { x, y };
  };

  // Filter and map buses that are inside bounds and belong to selected routes
  const plottedBuses = useMemo(() => {
    return buses
      .filter((bus) => {
        const cleanRouteId = bus.routeId
          .replace(/CWLMYJB|MYJB|JB|CWLMYMK|MYMK|MK/g, "")
          .trim();
        return (
          selectedRouteIds.has(cleanRouteId) &&
          bus.lat >= bounds.minLat &&
          bus.lat <= bounds.maxLat &&
          bus.lng >= bounds.minLng &&
          bus.lng <= bounds.maxLng
        );
      })
      .map((bus) => {
        const coords = getCoordinates(bus.lat, bus.lng);
        const cleanRouteId = bus.routeId
          .replace(/CWLMYJB|MYJB|JB|CWLMYMK|MYMK|MK/g, "")
          .trim();
        const color = selectedRouteColors[cleanRouteId] || "#3b82f6";
        return {
          ...bus,
          ...coords,
          color,
          cleanRouteId,
        };
      });
  }, [buses, bounds, selectedRouteIds, selectedRouteColors]);

  const plottedHubs = useMemo(() => {
    return hubs.map((hub) => ({
      ...hub,
      ...getCoordinates(hub.lat, hub.lng),
    }));
  }, [hubs, bounds]);

  // Drag handlers for SVG viewport panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale((prev) => Math.max(0.5, Math.min(prev + direction * 0.1, 4)));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setActiveTooltip(null);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none border border-white/5 rounded-2xl">
      {/* SVG Viewport Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 shadow-2xl backdrop-blur-md">
        <button
          onClick={handleReset}
          className="rounded-xl p-2.5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <motion.div
          style={{ x: position.x, y: position.y, scale }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="w-[800px] h-[600px] flex-shrink-0 relative"
        >
          <svg
            width="800"
            height="600"
            viewBox="0 0 800 600"
            className="w-full h-full"
            style={{ pointerEvents: "auto" }}
          >
            {/* Grid Lines Overlay */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="600" fill="url(#grid)" />

            {/* Hub Connections (Subtle network lines) */}
            {plottedHubs.map((hub, idx) =>
              plottedHubs.slice(idx + 1).map((otherHub, oIdx) => {
                const dist = Math.hypot(hub.x - otherHub.x, hub.y - otherHub.y);
                // Connect only if they are relatively close, creating local link networks
                if (dist < 220) {
                  return (
                    <line
                      key={`${idx}-${oIdx}`}
                      x1={hub.x}
                      y1={hub.y}
                      x2={otherHub.x}
                      y2={otherHub.y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  );
                }
                return null;
              })
            )}

            {/* Static Hubs */}
            {plottedHubs.map((hub) => (
              <g key={hub.name}>
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r="14"
                  fill="rgba(59, 130, 246, 0.05)"
                  stroke="rgba(59, 130, 246, 0.2)"
                  strokeWidth="1"
                />
                <circle cx={hub.x} cy={hub.y} r="5" fill="#3b82f6" />
                <text
                  x={hub.x}
                  y={hub.y - 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none select-none tracking-wide"
                >
                  {hub.name}
                </text>
              </g>
            ))}

            {/* Live Buses */}
            {plottedBuses.map((bus) => (
              <g
                key={bus.vehicleId}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTooltip(bus);
                }}
                className="cursor-pointer group"
              >
                {/* Glowing ring */}
                <circle
                  cx={bus.x}
                  cy={bus.y}
                  r="12"
                  fill={`${bus.color}22`}
                  stroke={`${bus.color}aa`}
                  strokeWidth="1.5"
                  className="animate-ping origin-center duration-1000"
                  style={{ animationDuration: "3s" }}
                />
                {/* Main dot */}
                <circle
                  cx={bus.x}
                  cy={bus.y}
                  r="9"
                  fill={bus.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="group-hover:scale-125 transition-transform duration-200"
                />
                {/* Badge text inside dot */}
                <text
                  x={bus.x}
                  y={bus.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7"
                  fontWeight="800"
                  className="pointer-events-none select-none"
                >
                  {bus.cleanRouteId}
                </text>
              </g>
            ))}
          </svg>
        </motion.div>
      </div>

      {/* Floating Info Tooltip */}
      <AnimatePresence>
        {activeTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-4 right-4 z-20 w-64 glass-panel rounded-2xl p-4 shadow-2xl border border-white/10 bg-slate-900/90 text-white backdrop-blur-md"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  myBAS Route {activeTooltip.cleanRouteId}
                </h4>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  {activeTooltip.licensePlate}
                </p>
              </div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-2 mt-2">
              <div>
                <span className="text-slate-400">Speed</span>
                <p className="font-semibold">{activeTooltip.speed} km/h</p>
              </div>
              <div>
                <span className="text-slate-400">Last Update</span>
                <p className="font-semibold">
                  {new Date(activeTooltip.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Coordinates</span>
                <p className="font-semibold font-mono text-[10px]">
                  {activeTooltip.lat.toFixed(5)}, {activeTooltip.lng.toFixed(5)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
