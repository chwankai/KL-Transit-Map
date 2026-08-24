import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RotateCcw, Navigation, X, Layers } from "lucide-react";
import type { DecodedVehicle } from "../../lib/bus-decoder";
import { useSettings } from "../../context/SettingsContext";

export interface BusRouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RapidBusRoute {
  id: string;
  name: string;
  desc: string;
  origin: string;
  dest: string;
  category: "trunk" | "feeder";
  color: string;
  stopCount: number;
  stops: BusRouteStop[];
  path: [number, number][]; // [[lat, lng], ...]
}

interface LeafletBusMapProps {
  buses: DecodedVehicle[];
  allRoutes: RapidBusRoute[];
  showAllRoutes: boolean;
  onToggleShowAllRoutes: () => void;
  selectedRoute: RapidBusRoute | null;
  focusedStop: BusRouteStop | null;
  onSelectRoute?: (route: RapidBusRoute) => void;
  onClearSelectedRoute?: () => void;
  routeColorMap?: Record<string, string>;
}

// Major transport hubs across Klang Valley for rapid spatial orientation
const MAJOR_HUBS = [
  { name: "Pasar Seni", lat: 3.1423, lng: 101.6953 },
  { name: "KL Sentral", lat: 3.1344, lng: 101.6865 },
  { name: "Maluri", lat: 3.1287, lng: 101.7275 },
  { name: "Chow Kit", lat: 3.1661, lng: 101.6982 },
  { name: "Titiwangsa", lat: 3.1732, lng: 101.6958 },
  { name: "Ampang", lat: 3.1500, lng: 101.7600 },
  { name: "Sunway Pyramid", lat: 3.0722, lng: 101.6074 },
  { name: "Shah Alam", lat: 3.0738, lng: 101.5183 },
  { name: "Putrajaya Sentral", lat: 2.9308, lng: 101.6706 },
  { name: "Kajang", lat: 2.9827, lng: 101.7909 },
  { name: "Gombak", lat: 3.2312, lng: 101.7121 },
  { name: "Bandar Utama", lat: 3.1504, lng: 101.6148 },
];

export const LeafletBusMap: React.FC<LeafletBusMapProps> = ({
  buses,
  allRoutes,
  showAllRoutes,
  onToggleShowAllRoutes,
  selectedRoute,
  focusedStop,
  onSelectRoute,
  onClearSelectedRoute,
  routeColorMap = {},
}) => {
  const { theme, t } = useSettings();
  const mapRef = useRef<L.Map | null>(null);
  const allRoutesLayerRef = useRef<L.LayerGroup | null>(null);
  const routePathLayerRef = useRef<L.LayerGroup | null>(null);
  const busLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const stopMarkersRef = useRef<Record<string, L.Marker>>({});

  // User location marker and halo
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const defaultCenter: [number, number] = [3.1390, 101.6869];
  const defaultZoom = typeof window !== "undefined" && window.innerWidth < 768 ? 11 : 12;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    const map = L.map("leaflet-bus-map", {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
      minZoom: 9,
      maxZoom: 18,
    });

    mapRef.current = map;

    // Tile Layer based on theme
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer groups in visual stack order
    const allRoutesLayer = L.layerGroup().addTo(map);
    allRoutesLayerRef.current = allRoutesLayer;

    const routePathLayer = L.layerGroup().addTo(map);
    routePathLayerRef.current = routePathLayer;

    const hubsLayer = L.layerGroup().addTo(map);
    hubsLayerRef.current = hubsLayer;

    const busLayer = L.layerGroup().addTo(map);
    busLayerRef.current = busLayer;

    // Render major hub landmark badges
    MAJOR_HUBS.forEach((hub) => {
      const hubIcon = L.divIcon({
        className: "custom-hub-icon",
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 3px;
            background: ${isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)"};
            border: 1px solid ${isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)"};
            color: ${isDark ? "#cbd5e1" : "#1e293b"};
            padding: 1.5px 6px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            backdrop-filter: blur(4px);
            pointer-events: none;
          ">
            <span style="font-size: 8.5px; color: #38bdf8;">📍</span>
            <span>${hub.name}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([hub.lat, hub.lng], { icon: hubIcon, interactive: false }).addTo(hubsLayer);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Update Theme Tile Layer dynamically
  useEffect(() => {
    if (!tileLayerRef.current || !mapRef.current) return;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    tileLayerRef.current.setUrl(tileUrl);
  }, [theme]);

  // 3. Render All Bus Lines Network Layer when enabled
  useEffect(() => {
    if (!allRoutesLayerRef.current) return;
    const layer = allRoutesLayerRef.current;
    layer.clearLayers();

    if (!showAllRoutes) return;

    allRoutes.forEach((route) => {
      if (!route.path || route.path.length < 2) return;
      const isSelected = selectedRoute?.id === route.id;
      const color = route.color || "#3b82f6";

      const polyline = L.polyline(route.path, {
        color: color,
        weight: isSelected ? 5.5 : 3.2,
        opacity: isSelected ? 0.95 : 0.55,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Tooltip on hover
      polyline.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 10px; font-weight: 700; padding: 2px;">
          <span style="color: ${color}; font-weight: 900;">${route.name}</span>: ${route.desc}
        </div>
      `, { sticky: true, opacity: 0.95 });

      // Click to select route
      polyline.on("click", () => {
        onSelectRoute?.(route);
      });
    });
  }, [allRoutes, showAllRoutes, selectedRoute, onSelectRoute]);

  // 4. Render Selected Route Geometry & Stops
  useEffect(() => {
    if (!mapRef.current || !routePathLayerRef.current) return;
    const layer = routePathLayerRef.current;
    layer.clearLayers();
    stopMarkersRef.current = {};

    if (!selectedRoute) return;

    const routeColor = selectedRoute.color || "#3b82f6";
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Draw Polyline path
    if (selectedRoute.path && selectedRoute.path.length > 1) {
      // Glow underlay line
      L.polyline(selectedRoute.path, {
        color: routeColor,
        weight: 8.5,
        opacity: 0.4,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Main polyline
      const mainLine = L.polyline(selectedRoute.path, {
        color: routeColor,
        weight: 4.8,
        opacity: 0.98,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Auto-fit bounds
      try {
        const bounds = mainLine.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      } catch {}
    }

    // Draw Stop Markers along the route
    if (selectedRoute.stops && selectedRoute.stops.length > 0) {
      selectedRoute.stops.forEach((stop, index) => {
        const isTerminus = index === 0 || index === selectedRoute.stops.length - 1;
        const stopIcon = L.divIcon({
          className: "custom-bus-stop-icon",
          html: `
            <div style="
              width: ${isTerminus ? "12px" : "8.5px"};
              height: ${isTerminus ? "12px" : "8.5px"};
              background-color: ${isTerminus ? "#ffffff" : routeColor};
              border: 2px solid ${isTerminus ? routeColor : isDark ? "#0f172a" : "#ffffff"};
              border-radius: 50%;
              box-shadow: 0 1px 4px rgba(0,0,0,0.5);
              cursor: pointer;
            "></div>
          `,
          iconSize: [isTerminus ? 12 : 8.5, isTerminus ? 12 : 8.5],
          iconAnchor: [isTerminus ? 6 : 4.25, isTerminus ? 6 : 4.25],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(layer);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; line-height: 1.35; padding: 2px;">
            <div style="font-size: 9px; font-weight: 800; color: ${routeColor}; text-transform: uppercase; margin-bottom: 2px;">
              Stop #${index + 1}
            </div>
            <div style="font-weight: 700; color: ${isDark ? "#f1f5f9" : "#0f172a"}; font-size: 11px;">
              ${stop.name}
            </div>
          </div>
        `, { closeButton: false, offset: [0, -6] });

        stopMarkersRef.current[`${stop.id}_${index}`] = marker;
        stopMarkersRef.current[stop.id] = marker;
      });
    }
  }, [selectedRoute, theme]);

  // 5. Handle Focused Stop Selection (Fly to stop & open popup on map)
  useEffect(() => {
    if (!focusedStop || !mapRef.current) return;
    const marker = stopMarkersRef.current[focusedStop.id];
    mapRef.current.flyTo([focusedStop.lat, focusedStop.lng], 16, { duration: 0.8 });
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 400);
    }
  }, [focusedStop]);

  // 6. Render Real-time Live Buses
  useEffect(() => {
    if (!busLayerRef.current || !mapRef.current) return;
    const layer = busLayerRef.current;
    layer.clearLayers();

    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    buses.forEach((bus) => {
      // Clean display route id (e.g. U3000 -> 300, T7820 -> T782)
      const cleanRouteId = bus.routeId
        .replace(/^U([0-9]+)0$/, "$1")
        .replace(/^T([0-9]+)0$/, "T$1")
        .replace(/^U/, "");

      const routeColor = routeColorMap[bus.routeId] || routeColorMap[cleanRouteId] || "#3b82f6";
      const isSelected = selectedRoute && (selectedRoute.id === bus.routeId || selectedRoute.name === cleanRouteId);

      const busIcon = L.divIcon({
        className: "custom-live-bus-marker",
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 3.5px;
            background-color: ${routeColor};
            color: #ffffff;
            padding: 3px 6px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 800;
            box-shadow: 0 3px 10px rgba(0,0,0,0.35), 0 0 0 2px ${isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)"};
            white-space: nowrap;
            cursor: pointer;
            transform: scale(${isSelected ? "1.2" : "1"});
            transition: transform 0.2s ease;
          ">
            <svg style="width: 11px; height: 11px; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
            <span>${cleanRouteId}</span>
            <span style="font-size: 8px; opacity: 0.9; font-weight: 600;">${bus.speed}km/h</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [24, 12],
      });

      const marker = L.marker([bus.lat, bus.lng], { icon: busIcon, zIndexOffset: isSelected ? 1000 : 500 }).addTo(layer);

      const updateAgoSecs = Math.max(0, Math.round((Date.now() - bus.timestamp) / 1000));

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 160px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="background-color: ${routeColor}; color: white; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800;">
              Route ${cleanRouteId}
            </span>
            <span style="font-size: 9px; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 9999px;">
              ● LIVE
            </span>
          </div>
          <div style="font-size: 11px; color: ${isDark ? "#94a3b8" : "#475569"}; margin-bottom: 2px;">
            <strong>${t("licensePlate")}:</strong> <span style="color: ${isDark ? "#f8fafc" : "#0f172a"};">${bus.licensePlate}</span>
          </div>
          <div style="font-size: 11px; color: ${isDark ? "#94a3b8" : "#475569"}; margin-bottom: 2px;">
            <strong>${t("speed")}:</strong> <span style="color: ${isDark ? "#f8fafc" : "#0f172a"};">${bus.speed} km/h</span>
          </div>
          <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">
            Updated ${updateAgoSecs}s ago
          </div>
        </div>
      `, { closeButton: false, offset: [0, -10] });
    });
  }, [buses, selectedRoute, routeColorMap, theme, t]);

  const handleResetView = () => {
    if (mapRef.current) {
      if (selectedRoute && selectedRoute.path.length > 1) {
        const poly = L.polyline(selectedRoute.path);
        mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 15 });
      } else {
        mapRef.current.flyTo(defaultCenter, defaultZoom, { duration: 0.8 });
      }
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!mapRef.current) return;

        // Create or update user pulsing dot marker
        const userIcon = L.divIcon({
          className: "custom-user-location-marker",
          html: `
            <div class="user-location-marker-container">
              <div class="user-location-pulse-ring"></div>
              <div class="user-location-core-dot"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 2000 }).addTo(mapRef.current);
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }

        // Create or update accuracy halo circle
        if (!userCircleRef.current) {
          userCircleRef.current = L.circle([latitude, longitude], {
            radius: Math.max(accuracy || 30, 25),
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(mapRef.current);
        } else {
          userCircleRef.current.setLatLng([latitude, longitude]);
          userCircleRef.current.setRadius(Math.max(accuracy || 30, 25));
        }

        mapRef.current.flyTo([latitude, longitude], 15, { duration: 1.0 });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 3000 }
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div id="leaflet-bus-map" className="w-full h-full z-10 bg-background overflow-hidden" />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        {/* Toggle All Bus Lines Button */}
        <button
          onClick={onToggleShowAllRoutes}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all active:scale-90 shadow-xl backdrop-blur-md ${
            showAllRoutes
              ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-500/30"
              : "border-border bg-card/95 text-text-primary hover:bg-button-secondary"
          }`}
          title={showAllRoutes ? t("hideAllLines") : t("showAllLines")}
        >
          <Layers className="h-4 w-4" />
        </button>

        <button
          onClick={handleResetView}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card/95 p-2 text-text-primary shadow-xl backdrop-blur-md transition-all hover:bg-button-secondary active:scale-90"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={handleLocateMe}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card/95 p-2 text-text-primary shadow-xl backdrop-blur-md transition-all hover:bg-button-secondary active:scale-90"
          title="My Location"
        >
          <Navigation className="h-4 w-4" />
        </button>
      </div>

      {/* Selected Route Floating Badge Indicator */}
      {selectedRoute && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md animate-fade-in max-w-[85vw] sm:max-w-md">
          <span
            style={{ backgroundColor: selectedRoute.color }}
            className="rounded-lg px-2 py-0.5 text-xs font-black text-white shrink-0 shadow-sm"
          >
            {selectedRoute.name}
          </span>
          <span className="truncate text-xs font-bold text-text-primary">
            {selectedRoute.desc}
          </span>
          {onClearSelectedRoute && (
            <button
              onClick={onClearSelectedRoute}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-button-secondary rounded-lg transition-colors ml-1 shrink-0"
              title="Clear Route"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
