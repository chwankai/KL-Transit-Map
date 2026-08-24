import React, { useState, useRef, useEffect, useCallback } from "react";

import {
  RotateCcw,
  Map as MapIcon,
  Crosshair,
  Navigation,
  Loader2,
  AlertCircle,
  X,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { stations, lines } from "../lib/transit-data";
import stationCoords from "../../public/station_coords.json";
import railTracks from "../../public/rail_tracks.json";
import { useSettings } from "../context/SettingsContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackEvent } from "../lib/analytics";

interface UserLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
}

interface NearestStationData {
  name: string;
  distance: number;
  codes: string[];
  lines: string[];
}

const DEFAULT_REAL_SCALE_CENTER: [number, number] = [3.086790, 101.628849];

const DEFAULT_REAL_SCALE_ZOOM = 12;

export const MapView: React.FC = () => {
  const { language, theme, t, tStation, tLine } = useSettings();
  const [mapType, setMapType] = useState<"standard" | "upcoming">("standard");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Default is always standard schematic map
  const [showRealScale, setShowRealScale] = useState<boolean>(false);
  const [pendingLocate, setPendingLocate] = useState(false);

  // Real-time user location state
  const [userLocation, setUserLocation] = useState<UserLocationData | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<"idle" | "locating" | "following" | "located" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearestStation, setNearestStation] = useState<NearestStationData | null>(null);
  const [showNearestCard, setShowNearestCard] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const trackingStatusRef = useRef<"idle" | "locating" | "following" | "located" | "error">("idle");
  const userLocationRef = useRef<UserLocationData | null>(null);

  // Keep refs in sync for event listeners
  useEffect(() => {
    trackingStatusRef.current = trackingStatus;
  }, [trackingStatus]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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
    
    const getNormalized = (str: string): string => {
      return str.replace(/[^A-Z0-9]/g, "").toUpperCase();
    };
    
    const getZeroStripped = (str: string): string => {
      return str.replace(/^([A-Z]+)0+([0-9]+)$/, "$1$2");
    };

    let normalizedKey = getNormalized(cleanKey);
    if (normalizedKey.endsWith("TRX") && normalizedKey !== "TRX") {
      normalizedKey = normalizedKey.slice(0, -3);
    }
    const strippedKey = getZeroStripped(normalizedKey);

    const foundKey = Object.keys(stationCoords).find(k => {
      let normK = getNormalized(k);
      if (normK.endsWith("TRX") && normK !== "TRX") {
        normK = normK.slice(0, -3);
      }
      const stripK = getZeroStripped(normK);
      return normK === normalizedKey || stripK === strippedKey || normK === strippedKey || stripK === normalizedKey;
    });
    if (foundKey) return (stationCoords as any)[foundKey];
    
    return null;
  };

  // Haversine distance formula between two lat/lng points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Find nearest station to given coordinates
  const findNearestStation = useCallback((lat: number, lng: number): NearestStationData | null => {
    let nearest: NearestStationData | null = null;
    let minDistance = Infinity;

    Object.entries(stations).forEach(([name, node]) => {
      const coord = getStationCoord(name) || getStationCoord(node.codes[0]);
      if (coord) {
        const dist = calculateDistance(lat, lng, coord.lat, coord.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = {
            name,
            distance: Math.round(dist),
            codes: node.codes,
            lines: node.lines.filter((l) => l !== "WALKWAY"),
          };
        }
      }
    });

    return nearest;
  }, []);

  // Format distance for UI
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return t("metersAway").replace("{distance}", String(meters));
    }
    return t("kmAway").replace("{distance}", (meters / 1000).toFixed(1));
  };

  // Create Leaflet divIcon for real-time user marker
  const createUserLocationIcon = (heading: number | null) => {
    const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
    const headingHtml = hasHeading
      ? `<div class="user-location-heading-cone" style="transform: rotate(${heading}deg);"></div>`
      : "";

    return L.divIcon({
      className: "custom-user-location-marker",
      html: `
        <div class="user-location-marker-container">
          <div class="user-location-pulse-ring"></div>
          ${headingHtml}
          <div class="user-location-core-dot"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Create popup HTML for user location marker
  const createUserPopupHtml = useCallback(
    (nearest: NearestStationData | null) => {
      const distFormatted = nearest ? formatDistance(nearest.distance) : "";

      return `
        <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
          <div class="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb; box-shadow: 0 0 6px rgba(37,99,235,0.6);"></span>
            ${t("myLocation")}
          </div>
          ${
            nearest
              ? `
            <div class="pt-2 border-t border-slate-200 mt-1">
              <div class="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">${t("nearestStation")}</div>
              <div class="text-xs font-bold text-slate-900 mt-0.5">${tStation(nearest.name)}</div>
              ${language === "zh" ? `<div style="font-size: 9px; color: #64748b; font-weight: 500; margin-top: 1px;">${nearest.name}</div>` : ""}
              <div class="text-[10px] text-blue-600 font-semibold mt-0.5">${distFormatted}</div>
              <div class="pt-2 mt-1 flex justify-center">
                <a href="#/station/${encodeURIComponent(nearest.name)}" style="color: white !important;" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">${t("viewArrivals")}</a>
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    },
    [t, tStation, language]
  );

  // Stop tracking helper
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (accuracyCircleRef.current && mapRef.current) {
      mapRef.current.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }
    setTrackingStatus("idle");
    setUserLocation(null);
    setNearestStation(null);
  }, []);

  // Request & Start watching real-time location
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("locationUnavailable"));
      setTrackingStatus("error");
      return;
    }

    setLocationError(null);
    setTrackingStatus("locating");
    trackEvent("locate_me_start", "map");

    // Clear previous watcher if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading } = pos.coords;
      const newLoc: UserLocationData = {
        lat: latitude,
        lng: longitude,
        accuracy,
        heading: heading !== null && !isNaN(heading) ? heading : null,
      };

      setUserLocation(newLoc);
      const nearest = findNearestStation(latitude, longitude);
      setNearestStation(nearest);
      setShowNearestCard(true);

      const map = mapRef.current;
      if (map) {
        // Update or create User Marker
        if (!userMarkerRef.current) {
          const marker = L.marker([latitude, longitude], {
            icon: createUserLocationIcon(newLoc.heading),
            zIndexOffset: 1000,
          }).addTo(map);

          marker.bindPopup(createUserPopupHtml(nearest), {
            closeButton: false,
            minWidth: 160,
          });

          userMarkerRef.current = marker;
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
          userMarkerRef.current.setIcon(createUserLocationIcon(newLoc.heading));
          userMarkerRef.current.setPopupContent(createUserPopupHtml(nearest));
        }

        // Update or create Accuracy Circle
        if (!accuracyCircleRef.current) {
          const circle = L.circle([latitude, longitude], {
            radius: Math.max(accuracy, 10),
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.12,
            weight: 1.5,
            opacity: 0.45,
          }).addTo(map);
          accuracyCircleRef.current = circle;
        } else {
          accuracyCircleRef.current.setLatLng([latitude, longitude]);
          accuracyCircleRef.current.setRadius(Math.max(accuracy, 10));
        }

        // If in 'locating' or 'following' mode, smoothly center/fly map to user position
        if (trackingStatusRef.current === "locating" || trackingStatusRef.current === "following") {
          const targetZoom = Math.max(map.getZoom(), 15);
          map.flyTo([latitude, longitude], targetZoom, { duration: 1.2 });
          setTrackingStatus("following");
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      let errorKey = "locationError";
      if (err.code === err.PERMISSION_DENIED) {
        errorKey = "locationPermissionDenied";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errorKey = "locationUnavailable";
      } else if (err.code === err.TIMEOUT) {
        errorKey = "locationTimeout";
      }
      setLocationError(errorKey);
      setTrackingStatus("error");
      trackEvent("locate_me_error", "map", String(err.code));
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000,
    });

    watchIdRef.current = watchId;
  }, [t, findNearestStation, createUserPopupHtml]);

  // Handle click on Locate button
  const handleLocateButtonClick = () => {
    if (trackingStatus === "following") {
      // Toggle tracking off when already centered & following
      stopLocationTracking();
      trackEvent("locate_me_stop", "map");
    } else if (trackingStatus === "located") {
      // Recenter on user location
      if (userLocation && mapRef.current) {
        const targetZoom = Math.max(mapRef.current.getZoom(), 15);
        mapRef.current.flyTo([userLocation.lat, userLocation.lng], targetZoom, { duration: 1.0 });
        setTrackingStatus("following");
        trackEvent("locate_me_recenter", "map");
      } else {
        startLocationTracking();
      }
    } else {
      // Idle, locating, or error state -> trigger start/retry
      startLocationTracking();
    }
  };

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
    trackEvent("reset_map_view", "map");
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
      stopLocationTracking();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Initialize map centering at 3°05'57.1"N 101°38'47.7"E (mobile: 50% zoomed out / zoom 11)
    const isMobile = window.innerWidth < 768;
    const initialZoom = isMobile ? 11 : DEFAULT_REAL_SCALE_ZOOM;

    const map = L.map("leaflet-map", {
      zoomControl: false,
    }).setView(DEFAULT_REAL_SCALE_CENTER, initialZoom);
    mapRef.current = map;

    // Detach following mode when user manually drags the Leaflet map
    map.on("dragstart", () => {
      if (trackingStatusRef.current === "following") {
        setTrackingStatus("located");
      }
    });

    // Use high contrast thematic tiles matching theme settings
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && systemIsDark);
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
          const lineNameSP = tLine(lines["SP"]?.name || "LRT Sri Petaling Line");
          const rawNameSP = lines["SP"]?.name || "LRT Sri Petaling Line";
          const lineNameAG = tLine(lines["AG"]?.name || "LRT Ampang Line");
          const rawNameAG = lines["AG"]?.name || "LRT Ampang Line";

          const popupHtmlSP = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineNameSP}</div>
              ${language === 'zh' ? `<div style="font-size: 9px; color: #64748b; font-weight: 500; margin-top: 2px;">${rawNameSP}</div>` : ''}
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=SP" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">${t("viewLine")}</a>
              </div>
            </div>
          `;

          const popupHtmlAG = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineNameAG}</div>
              ${language === 'zh' ? `<div style="font-size: 9px; color: #64748b; font-weight: 500; margin-top: 2px;">${rawNameAG}</div>` : ''}
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=AG" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">${t("viewLine")}</a>
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
          const lineName = tLine(lines[track.lineId]?.name || track.lineId);
          const rawName = lines[track.lineId]?.name || track.lineId;
          const popupHtml = `
            <div style="text-align: center !important;" class="p-2.5 space-y-2 font-sans leading-snug">
              <div class="text-xs font-bold text-slate-900">${lineName}</div>
              ${language === 'zh' ? `<div style="font-size: 9px; color: #64748b; font-weight: 500; margin-top: 2px;">${rawName}</div>` : ''}
              <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
                <a href="#/lines?line=${track.lineId}" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">${t("viewLine")}</a>
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
      "Tun Razak Exchange (TRX)",
      "Kwasa Damansara",
      "Sungai Besi",
      "Putra Heights",
      "Pasar Seni",
      "USJ 7"
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
          <div class="text-xs font-bold text-slate-900">${tStation(name)}</div>
          ${language === 'zh' ? `<div style="font-size: 9px; color: #64748b; font-weight: 500; margin-top: 2px;">${name}</div>` : ''}
          <div class="flex gap-1 flex-wrap justify-center">
            ${node.codes.map(code => {
              const lineId = getLineOfCode(code);
              return `<span style="background-color: ${getLineColor(lineId)}; color: white; padding: 2.5px 5.5px; font-size: 8px; font-weight: 800; border-radius: 4px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${code}</span>`;
            }).join("")}
          </div>
          <div class="pt-2.5 border-t border-slate-200 mt-1 flex justify-center">
            <a href="#/station/${encodeURIComponent(name)}" style="color: white !important;" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all no-underline inline-block hover:scale-95 active:scale-95 shadow-md">${t("viewArrivals")}</a>
          </div>
        </div>
      `;

      if (isSharedAmpangSriPetaling || isSingleDotInterchange) {
        // Plot a single gradient-bordered dot for integrated interchanges and shared-platform stations
        const coord = getStationCoord(name) || getStationCoord(node.codes[0]);
        if (!coord) return;

        const colors = node.lines.filter(l => l !== "WALKWAY").map(l => getLineColor(l));
        const gradient = colors.length > 1
          ? `linear-gradient(#ffffff, #ffffff) padding-box, conic-gradient(${[...colors, colors[0]].join(", ")}) border-box`
          : `linear-gradient(#ffffff, #ffffff) padding-box, ${colors[0] || "#0f172a"} border-box`;

        const customIcon = L.divIcon({
          className: "custom-interchange-marker",
          html: `<div style="width: 15px; height: 15px; border-radius: 50%; border: 3px solid transparent; background: ${gradient}; box-shadow: 0 1px 3px rgba(0,0,0,0.35);"></div>`,
          iconSize: [15, 15],
          iconAnchor: [7.5, 7.5],
        });

        L.marker([coord.lat, coord.lng], { icon: customIcon })
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
      stopLocationTracking();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showRealScale, theme, language, t, tLine, tStation, stopLocationTracking]);

  // Handle pending locate triggered from schematic view
  useEffect(() => {
    if (showRealScale && pendingLocate) {
      const timer = setTimeout(() => {
        if (mapRef.current) {
          setPendingLocate(false);
          startLocationTracking();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showRealScale, pendingLocate, startLocationTracking]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden select-none">
      {/* Floating Toolbar (Standard schematic map view only) */}
      {!showRealScale && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <button
            onClick={handleReset}
            className="rounded-xl p-2.5 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-all active:scale-90"
            title={t("resetView")}
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setShowRealScale(true);
              setPendingLocate(true);
              trackEvent("toggle_real_scale_from_locate", "map");
            }}
            className="rounded-xl p-2.5 text-text-secondary hover:bg-button-secondary hover:text-blue-500 transition-all active:scale-90"
            title={t("locateMe")}
          >
            <Crosshair className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Floating Controls for Real Scale Map on top-left */}
      {showRealScale && (
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
          {/* Refresh / Reset View Button */}
          <button
            onClick={() => {
              if (mapRef.current) {
                const isMobile = window.innerWidth < 768;
                const resetZoom = isMobile ? 11 : DEFAULT_REAL_SCALE_ZOOM;
                mapRef.current.setView(DEFAULT_REAL_SCALE_CENTER, resetZoom);
                if (trackingStatus === "following") {
                  setTrackingStatus("located");
                }
              }
            }}
            className="rounded-xl p-2.5 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-all active:scale-90"
            title={t("resetView")}
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {/* Real-time Location / GPS Button */}
          <button
            onClick={handleLocateButtonClick}
            disabled={trackingStatus === "locating"}
            className={`relative flex items-center justify-center rounded-xl p-2.5 transition-all active:scale-90 ${
              trackingStatus === "following"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : trackingStatus === "located"
                ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                : "text-text-secondary hover:bg-button-secondary hover:text-text-primary"
            }`}
            title={
              trackingStatus === "following"
                ? t("stopTracking")
                : trackingStatus === "located"
                ? t("recenterLocation")
                : t("locateMe")
            }
          >
            {trackingStatus === "locating" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : trackingStatus === "following" ? (
              <Navigation className="h-5 w-5 fill-current" />
            ) : trackingStatus === "located" ? (
              <Crosshair className="h-5 w-5" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}

            {/* Active follow pulse ping */}
            {trackingStatus === "following" && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Floating Toggle Controls Panel top-right */}
      <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
        {/* Toggle Map Type (Standard schematic map view only) */}
        {!showRealScale && (
          <button
            onClick={() => {
              const nextType = mapType === "standard" ? "upcoming" : "standard";
              setMapType(nextType);
              trackEvent("toggle_map_type", "map", nextType);
            }}
            className="flex items-center gap-2 rounded-2xl border border-border bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-blue-700 transition-all active:scale-95 select-none"
          >
            <MapIcon className="h-4 w-4" />
            {mapType === "standard" ? t("circleLineMap") : t("standardMap")}
          </button>
        )}

        {/* Real Scale Map Toggle Button */}
        <button
          onClick={() => {
            const nextRealScale = !showRealScale;
            setShowRealScale(nextRealScale);
            trackEvent("toggle_real_scale", "map", nextRealScale ? "real_scale" : "schematic");
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 select-none"
        >
          <MapIcon className="h-4 w-4" />
          {showRealScale ? t("schematicMap") : t("realScaleMap")}
        </button>
      </div>

      {/* Location Error Notification Banner */}
      <AnimatePresence>
        {locationError && showRealScale && (
          <div className="absolute bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="pointer-events-auto max-w-sm sm:max-w-md w-full flex items-start gap-3 rounded-2xl border border-red-500/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-text-primary leading-snug">
                <div className="font-bold text-red-500 mb-0.5">{t("locationError")}</div>
                <div className="text-text-secondary">
                  {locationError === "locationPermissionDenied"
                    ? t("locationPermissionDenied")
                    : locationError === "locationUnavailable"
                    ? t("locationUnavailable")
                    : locationError === "locationTimeout"
                    ? t("locationTimeout")
                    : t("locationError")}
                </div>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="rounded-lg p-1 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Nearest Station Info Floating Card (Real Scale Map) */}
      <AnimatePresence>
        {showRealScale && userLocation && nearestStation && showNearestCard && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 max-w-sm w-auto mx-auto sm:mx-0 z-30 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-3.5 pr-9 shadow-2xl backdrop-blur-md"
          >
            {/* Top-Right Cross/Dismiss Button */}
            <button
              onClick={() => setShowNearestCard(false)}
              className="absolute top-2.5 right-2.5 rounded-lg p-1 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-colors"
              title={t("hide")}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Left Side: Single vertically aligned icon + 4 lines of text */}
            <div className="flex items-center gap-3 min-w-0 pr-1">
              {/* Single Vertically Aligned Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-500 shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>

              {/* 4 lines of content */}
              <div className="flex flex-col gap-1 min-w-0">
                {/* Line 1: NEAREST STATION */}
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary leading-none">
                  {t("nearestStation")}
                </span>

                {/* Line 2: {station code} */}
                <div className="flex gap-1 flex-wrap items-center">
                  {nearestStation.codes.map((code) => {
                    const lineId = getLineOfCode(code);
                    return (
                      <span
                        key={code}
                        style={{ backgroundColor: getLineColor(lineId) }}
                        className="rounded px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow-sm leading-none"
                      >
                        {code}
                      </span>
                    );
                  })}
                </div>

                {/* Line 3: {station name} */}
                <div className="truncate font-bold text-xs text-text-primary leading-tight">
                  {tStation(nearestStation.name)}
                  {language === "zh" && (
                    <span className="text-[9.5px] text-text-secondary font-medium ml-1">
                      {nearestStation.name}
                    </span>
                  )}
                </div>

                {/* Line 4: {distance} */}
                <span className="text-[10.5px] font-semibold text-blue-500 leading-none">
                  {formatDistance(nearestStation.distance)}
                </span>
              </div>
            </div>

            {/* Right Side: Vertically Aligned View Arrivals Button */}
            <div className="flex items-center shrink-0 self-center">
              <a
                href={`#/station/${encodeURIComponent(nearestStation.name)}`}
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95 no-underline whitespace-nowrap"
              >
                <span>{t("viewArrivals")}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
