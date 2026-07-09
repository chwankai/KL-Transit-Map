import React, { useState, useRef, useEffect } from "react";

import { RotateCcw, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";
import { stations, lines } from "../lib/transit-data";
import stationCoords from "../../public/station_coords.json";
import railTracks from "../../public/rail_tracks.json";
import { useSettings } from "../context/SettingsContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const MapView: React.FC = () => {
  const { theme } = useSettings();
  const [mapType, setMapType] = useState<"standard" | "upcoming">("standard");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Read interactive map state preference from localStorage so page redirects maintain view state
  const [showRealScale, setShowRealScale] = useState(() => {
    return localStorage.getItem("show_real_scale") === "true";
  });

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const mapUrl =
    mapType === "standard"
      ? "maps/Klang Valley Rail Map.jpg"
      : "maps/Circle Line.jpg";

  const [isResetting, setIsResetting] = useState(false);

  const getLineColor = (lineId: string) => {
    return lines[lineId]?.color || "#6b7280";
  };

  const getLineOfCode = (code: string): string => {
    const match = code.match(/^[a-zA-Z]+/);
    let lineId = match ? match[0] : "";
    if (lineId === "SB") {
      lineId = "BRT";
    }
    return lineId;
  };

  const getStationCoord = (key: string): { lat: number; lng: number } | null => {
    if (!key) return null;
    const cleanKey = key.trim().toUpperCase();
    
    if ((stationCoords as any)[cleanKey]) return (stationCoords as any)[cleanKey];
    if ((stationCoords as any)[key]) return (stationCoords as any)[key];
    
    // Heuristic matching: strip symbols, spaces
    const normalizedKey = cleanKey.replace(/[^A-Z0-9]/g, "");
    const foundKey = Object.keys(stationCoords).find(k => k.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === normalizedKey);
    if (foundKey) return (stationCoords as any)[foundKey];
    
    return null;
  };

  // Sync scale mode preference
  useEffect(() => {
    localStorage.setItem("show_real_scale", String(showRealScale));
  }, [showRealScale]);

  // Clamp map panning offsets to ensure a portion of the map remains visible
  const clampPosition = (x: number, y: number, currentScale: number) => {
    if (!containerRef.current || !imageRef.current) return { x, y };
    const rect = containerRef.current.getBoundingClientRect();
    
    const iw = imageRef.current.clientWidth || rect.width;
    const ih = imageRef.current.clientHeight || rect.height;

    // Center coordinates based limits:
    const minX = -rect.width / 2 + 100 - (iw * currentScale) / 2;
    const maxX = rect.width / 2 - 100 + (iw * currentScale) / 2;
    const minY = -rect.height / 2 + 100 - (ih * currentScale) / 2;
    const maxY = rect.height / 2 - 100 + (ih * currentScale) / 2;

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  // Reset zoom & pan
  const handleReset = () => {
    setIsResetting(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setTimeout(() => setIsResetting(false), 300);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.current.x;
    const rawY = e.clientY - dragStart.current.y;
    setPosition(clampPosition(rawX, rawY, scale));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler: scales relative to the cursor coordinates
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 0.15;
    const direction = e.deltaY < 0 ? 1 : -1;

    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    setScale((prevScale) => {
      const nextScale = Math.max(1, Math.min(prevScale + direction * zoomFactor, 4));
      if (nextScale === prevScale) return prevScale;

      setPosition((prevPos) => {
        const dx = cx - prevPos.x;
        const dy = cy - prevPos.y;
        const ratio = nextScale / prevScale;
        const targetX = cx - dx * ratio;
        const targetY = cy - dy * ratio;
        return clampPosition(targetX, targetY, nextScale);
      });

      return nextScale;
    });
  };

  // Mobile Touch handlers (includes pinch to zoom relative to midpoint)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;

    if (isDragging && e.touches.length === 1) {
      const rawX = e.touches[0].clientX - dragStart.current.x;
      const rawY = e.touches[0].clientY - dragStart.current.y;
      setPosition(clampPosition(rawX, rawY, scale));
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const rect = containerRef.current.getBoundingClientRect();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const cx = (touch1.clientX + touch2.clientX) / 2 - rect.left - rect.width / 2;
      const cy = (touch1.clientY + touch2.clientY) / 2 - rect.top - rect.height / 2;

      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      const delta = dist - lastTouchDistance.current;
      const zoomFactor = delta * 0.007;

      setScale((prevScale) => {
        const nextScale = Math.max(1, Math.min(prevScale + zoomFactor, 4));
        if (nextScale === prevScale) return prevScale;

        setPosition((prevPos) => {
          const dx = cx - prevPos.x;
          const dy = cy - prevPos.y;
          const ratio = nextScale / prevScale;
          const targetX = cx - dx * ratio;
          const targetY = cy - dy * ratio;
          return clampPosition(targetX, targetY, nextScale);
        });

        return nextScale;
      });
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  // Disable browser pull-to-refresh on mobile map page
  useEffect(() => {
    const preventDefault = (e: Event) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchmove", preventDefault, { passive: false });
    return () => document.removeEventListener("touchmove", preventDefault);
  }, []);

  // Leaflet map initialization and overlay logic
  useEffect(() => {
    if (!showRealScale) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Initialize map centering around Klang Valley
    const map = L.map("leaflet-map", {
      zoomControl: false,
    }).setView([3.1390, 101.6868], 12);
    mapRef.current = map;

    // Use high contrast thematic tiles matching active body dark mode class
    const isDark = document.documentElement.classList.contains("dark");
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    // 1. Draw OSM/GTFS realistic train paths from public/rail_tracks.json
    if (railTracks && railTracks.length > 0) {
      const drawnLineIds = new Set<string>();
      railTracks.forEach((track: any) => {
        if (drawnLineIds.has(track.lineId)) return;
        drawnLineIds.add(track.lineId);

        if (track.lineId === "AG_SP") {
          // Alternating two-color dashed segment from Sentul Timur to Chan Sow Lin
          const colorSP = getLineColor("SP");
          const colorAG = getLineColor("AG");
          const lineNameSP = lines["SP"]?.name || "LRT Sri Petaling Line";
          const lineNameAG = lines["AG"]?.name || "LRT Ampang Line";

          const popupHtmlSP = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineNameSP}</div>
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=SP" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">View Line</a>
              </div>
            </div>
          `;

          const popupHtmlAG = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineNameAG}</div>
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=AG" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">View Line</a>
              </div>
            </div>
          `;

          L.polyline(track.coords, {
            color: colorSP,
            weight: 5.5,
            opacity: 0.85,
            className: "cursor-pointer",
          })
            .addTo(map)
            .bindPopup(popupHtmlSP, { closeButton: false, minWidth: 150 });

          L.polyline(track.coords, {
            color: colorAG,
            weight: 5.5,
            opacity: 0.85,
            dashArray: "10, 12",
            className: "cursor-pointer",
          })
            .addTo(map)
            .bindPopup(popupHtmlAG, { closeButton: false, minWidth: 150 });
        } else {
          // Standard solid color line
          const lineName = lines[track.lineId]?.name || track.lineId;
          const popupHtml = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineName}</div>
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=${track.lineId}" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">View Line</a>
              </div>
            </div>
          `;

          L.polyline(track.coords, {
            color: getLineColor(track.lineId),
            weight: 5.5,
            opacity: 0.85,
            className: "cursor-pointer",
          })
            .addTo(map)
            .bindPopup(popupHtml, { closeButton: false, minWidth: 150 });
        }
      });
    }

    // 2. Draw fallback straight polylines only for walkways
    const gtfsDrawnLines = new Set(["KJ", "SP", "AG", "KG", "SA", "PY", "MR", "BRT"]);
    const drawnTracks = new Set<string>();

    Object.entries(stations).forEach(([name, node]) => {
      const s1 = getStationCoord(node.codes[0]) || getStationCoord(name);
      if (!s1) return;

      node.connections.forEach((conn) => {
        const destNode = Object.values(stations).find(st => st.name === conn.to);
        const s2 = destNode ? (getStationCoord(destNode.codes[0]) || getStationCoord(conn.to)) : null;
        if (!s2) return;

        const isWalk = conn.line === "WALKWAY";
        const isGtfsLine = gtfsDrawnLines.has(conn.line);

        if (isWalk || !isGtfsLine) {
          const trackKey = [name, conn.to].sort().join("_") + "_" + conn.line;

          if (!drawnTracks.has(trackKey)) {
            drawnTracks.add(trackKey);

            L.polyline([[s1.lat, s1.lng], [s2.lat, s2.lng]], {
              color: isWalk ? "#94a3b8" : getLineColor(conn.line),
              weight: isWalk ? 2.5 : 4.5,
              dashArray: isWalk ? "5, 7" : undefined,
              opacity: isWalk ? 0.65 : 0.85,
            }).addTo(map);
          }
        }
      });
    });

    // Draw the 4 specific walkway transfers as gray dashed lines between platforms
    const walkwayTransfers = [
      { from: "KJ27", to: "SA07" }, // Glenmarie
      { from: "KJ15", to: "MR1" },  // KL Sentral
      { from: "KG09", to: "SA01" }, // Bandar Utama
      { from: "KJ9", to: "PY20" }   // Ampang Park (KJ9)
    ];

    walkwayTransfers.forEach(transfer => {
      const c1 = getStationCoord(transfer.from);
      const c2 = getStationCoord(transfer.to);
      if (c1 && c2) {
        L.polyline([[c1.lat, c1.lng], [c2.lat, c2.lng]], {
          color: "#94a3b8",
          weight: 2.5,
          dashArray: "5, 7",
          opacity: 0.85,
         }).addTo(map);
      }
    });

    // 3. Plot station dots (circle markers), splitting interchanges where platforms are distinct
    const singleDotInterchanges = new Set([
      "Maluri",
      "Tun Razak Exchange",
      "Kwasa Damansara",
      "Sungai Besi",
      "Putra Heights"
    ]);

    Object.entries(stations).forEach(([name, node]) => {
      // Shared Ampang & Sri Petaling connection stations from Sentul Timur to Chan Sow Lin share the same physical platform
      const hasAG = node.codes.some(c => c.startsWith("AG"));
      const hasSP = node.codes.some(c => c.startsWith("SP"));
      const isSharedAmpangSriPetaling = hasAG && hasSP;
      const isSingleDotInterchange = singleDotInterchanges.has(name);

      // Popup HTML template loaded on platform dot selection
      const popupHtml = `
        <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
          <div class="text-xs font-bold text-slate-900">${name}</div>
          <div class="flex gap-1 flex-wrap justify-center">
            ${node.codes.map(code => {
              const lineId = getLineOfCode(code);
              return `<span style="background-color: ${getLineColor(lineId)}; color: white; padding: 2.5px 5.5px; font-size: 8px; font-weight: 800; border-radius: 4px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${code}</span>`;
            }).join("")}
          </div>
          <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
            <a href="#/station/${encodeURIComponent(name)}" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">View Arrival</a>
          </div>
        </div>
      `;

      if (isSharedAmpangSriPetaling || isSingleDotInterchange) {
        // Plot a single dot for parallel Ampang-Sri Petaling connection stations and specific integrated interchanges
        const coord = getStationCoord(name) || getStationCoord(node.codes[0]);
        if (!coord) return;

        L.circleMarker([coord.lat, coord.lng], {
          radius: 6.5,
          fillColor: "#ffffff",
          color: isSingleDotInterchange ? "#0f172a" : getLineColor("SP"),
          weight: 3,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(popupHtml, { closeButton: false, minWidth: 150 });
      } else {
        // Plot separate platform dots for other interchanges (like Bandar Utama KG and SA) and single stations
        node.codes.forEach(code => {
          const coord = getStationCoord(code) || getStationCoord(name);
          if (!coord) return;

          const lineId = getLineOfCode(code);
          const isInterchange = node.lines.filter(l => l !== "WALKWAY").length > 1;

          L.circleMarker([coord.lat, coord.lng], {
            radius: isInterchange ? 6.5 : 4.5,
            fillColor: "#ffffff",
            color: getLineColor(lineId),
            weight: isInterchange ? 3 : 2,
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup(popupHtml, { closeButton: false, minWidth: 150 });
        });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showRealScale, theme]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden select-none">
      {/* Floating Toolbar (Standard schematic map view only) */}
      {!showRealScale && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <button
            onClick={handleReset}
            className="rounded-xl p-2.5 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-all active:scale-90"
            title="Reset View"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Floating Toggle Controls Panel top-right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Toggle Map Type (Standard schematic map view only) */}
        {!showRealScale && (
          <button
            onClick={() =>
              setMapType((prev) => (prev === "standard" ? "upcoming" : "standard"))
            }
            className="flex items-center gap-2 rounded-2xl border border-border bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-blue-700 transition-all active:scale-95 select-none"
          >
            <MapIcon className="h-4 w-4" />
            {mapType === "standard" ? "Show Upcoming Circle Line" : "Show Standard Map"}
          </button>
        )}

        {/* Real Scale Map Toggle Button */}
        <button
          onClick={() => setShowRealScale((prev) => !prev)}
          className="flex items-center gap-2 rounded-2xl border border-border bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 select-none"
        >
          <MapIcon className="h-4 w-4" />
          {showRealScale ? "Show Schematic Map" : "Show Real Scale Map"}
        </button>
      </div>

      {/* Map Content Switcher */}
      {showRealScale ? (
        <div id="leaflet-map" className="w-full h-full z-10 bg-background overflow-hidden animate-fade-in" />
      ) : (
        /* Interactive Schematic Map Canvas */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        >
          <motion.div
            style={{
              x: position.x,
              y: position.y,
              scale: scale,
            }}
            className="relative w-full md:w-auto max-w-full max-h-full flex items-center justify-center"
            transition={isResetting ? { type: "spring", damping: 25, stiffness: 200 } : { duration: 0 }}
          >
            <img
              ref={imageRef}
              src={mapUrl}
              alt="Klang Valley Rail Map"
              className="pointer-events-none select-none w-full h-auto object-contain md:max-h-[90vh] rounded-lg shadow-2xl border border-border"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};
