import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DevNavBar } from "./DevNavBar";
import {
  MapPin, Compass, Navigation, RefreshCw,
  Copy, Check, Search, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, Map, ExternalLink, CheckCircle2,
  AlertCircle, Zap
} from "lucide-react";
import { stations, lines } from "../../lib/transit-data";
import { stationNamesZh } from "../../lib/translations";
import stationCoordsJson from "../../../public/station_coords.json";
import {
  getMockLocation,
  setMockLocation,
  setMockLocationActive,
  toggleMockLocation,
} from "../../lib/locationSimulator";
import type { MockLocationData } from "../../lib/locationSimulator";

const PRESET_LANDMARKS = [
  { name: "KLCC (Petronas Towers)", lat: 3.1579, lng: 101.7120, tag: "Tourist / CBD" },
  { name: "KL Sentral", lat: 3.1342, lng: 101.6861, tag: "Transit Hub" },
  { name: "Bukit Bintang (Pavilion)", lat: 3.1466, lng: 101.7115, tag: "Shopping" },
  { name: "Pasar Seni (Chinatown)", lat: 3.1424, lng: 101.6963, tag: "Culture" },
  { name: "Tun Razak Exchange (TRX)", lat: 3.1432, lng: 101.7202, tag: "Financial District" },
  { name: "Mid Valley Megamall", lat: 3.1177, lng: 101.6778, tag: "Shopping Hub" },
  { name: "Batu Caves", lat: 3.2379, lng: 101.6840, tag: "Tourist" },
  { name: "Putrajaya Sentral", lat: 2.9317, lng: 101.6713, tag: "Administrative" },
  { name: "KLIA Terminal 1", lat: 2.7562, lng: 101.7018, tag: "Airport" },
  { name: "Sunway Pyramid", lat: 3.0732, lng: 101.6075, tag: "BRT Hub" },
  { name: "Damansara Uptown", lat: 3.1352, lng: 101.6225, tag: "Commercial" },
  { name: "Subang Jaya (SS15)", lat: 3.0759, lng: 101.5898, tag: "Food & College" }
];

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  text: string;
  category?: string;
}

const getStationCodeColor = (code: string): string => {
  const prefix = code.replace(/[0-9]/g, "");
  if (lines[prefix]?.color) {
    return lines[prefix].color;
  }
  if (prefix === "KA" || prefix === "KB") return "#003b71";
  if (prefix === "KC") return "#0072bc";
  return "#2563eb";
};

// Haversine distance in meters
const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getStationCoordinate = (
  stationName: string,
  coordsMap: Record<string, { lat: number; lng: number }>
): { lat: number; lng: number } => {
  if (!stationName) return { lat: 0, lng: 0 };
  const cleanKey = stationName.trim().toUpperCase();
  if (coordsMap[cleanKey]) return coordsMap[cleanKey];
  if (coordsMap[stationName]) return coordsMap[stationName];

  const getNormalized = (str: string): string => str.replace(/[^A-Z0-9]/g, "").toUpperCase();
  let normalizedKey = getNormalized(cleanKey);
  if (normalizedKey.endsWith("TRX") && normalizedKey !== "TRX") {
    normalizedKey = normalizedKey.slice(0, -3);
  }

  const foundKey = Object.keys(coordsMap).find((k) => {
    let normK = getNormalized(k);
    if (normK.endsWith("TRX") && normK !== "TRX") {
      normK = normK.slice(0, -3);
    }
    return normK === normalizedKey || normK.includes(normalizedKey) || normalizedKey.includes(normK);
  });

  return foundKey && coordsMap[foundKey] ? coordsMap[foundKey] : { lat: 0, lng: 0 };
};

export const LocationInspectorView: React.FC = () => {
  const [mockData, setMockData] = useState<MockLocationData>(() => getMockLocation());
  const [customLat, setCustomLat] = useState<string>(() => mockData.lat.toFixed(6));
  const [customLng, setCustomLng] = useState<string>(() => mockData.lng.toFixed(6));
  const [customName, setCustomName] = useState<string>(() => mockData.name);
  const [stationSearch, setStationSearch] = useState<string>("");
  const [stationLineFilter, setStationLineFilter] = useState<string>("all");
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [toastList, setToastList] = useState<ToastItem[]>([]);

  const showAlert = useCallback((type: "success" | "error" | "info", text: string, category?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToastList((prev) => {
      const filtered = prev.filter((t) => {
        if (category && t.category === category) return false;
        if (!category && t.text === text) return false;
        return true;
      });
      return [...filtered, { id, type, text, category }];
    });
    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToastList((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<MockLocationData>;
      if (customEvent.detail) {
        setMockData(customEvent.detail);
        setCustomLat(customEvent.detail.lat.toFixed(6));
        setCustomLng(customEvent.detail.lng.toFixed(6));
        setCustomName(customEvent.detail.name);
      }
    };

    window.addEventListener("mock_location_changed", handleLocationChange);
    return () => {
      window.removeEventListener("mock_location_changed", handleLocationChange);
    };
  }, []);

  const stationCoordsMap = stationCoordsJson as Record<string, { lat: number; lng: number }>;

  // Calculate nearest transit station from current simulated coordinates
  const nearestStationInfo = useMemo<{ name: string; distance: number; codes: string[] } | null>(() => {
    let nearest: { name: string; distance: number; codes: string[] } | null = null;

    Object.entries(stations).forEach(([stName, stObj]) => {
      const coords = getStationCoordinate(stName, stationCoordsMap);
      if (coords && coords.lat && coords.lng) {
        const dist = calculateDistanceMeters(mockData.lat, mockData.lng, coords.lat, coords.lng);
        if (!nearest || dist < nearest.distance) {
          nearest = { name: stName, distance: dist, codes: stObj.codes || [] };
        }
      }
    });

    return nearest;
  }, [mockData.lat, mockData.lng, stationCoordsMap]);

  // All stations with coordinates
  const allStationsList = useMemo(() => {
    return Object.entries(stations).map(([name, data]) => {
      const coords = getStationCoordinate(name, stationCoordsMap);
      return {
        name,
        zhName: stationNamesZh[name] || "",
        codes: data.codes || [],
        lines: data.lines || [],
        lat: coords.lat,
        lng: coords.lng,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [stationCoordsMap]);

  const filteredStations = useMemo(() => {
    const q = stationSearch.trim().toLowerCase();
    return allStationsList.filter((st) => {
      if (stationLineFilter !== "all") {
        if (!st.lines.includes(stationLineFilter)) return false;
      }
      if (!q) return true;
      return (
        st.name.toLowerCase().includes(q) ||
        st.zhName.toLowerCase().includes(q) ||
        st.codes.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [allStationsList, stationSearch, stationLineFilter]);

  const handleToggleActive = () => {
    const next = toggleMockLocation();
    showAlert(
      next ? "success" : "info",
      next ? "Simulated Location Enabled (Mock GPS Active)." : "Real Device GPS Restored.",
      "location_toggle"
    );
  };

  const handleSelectPreset = (preset: { name: string; lat: number; lng: number }) => {
    setMockLocation(preset.lat, preset.lng, preset.name);
    setMockLocationActive(true);
    showAlert("success", `Teleported to ${preset.name}`, "teleport");
  };

  const handleApplyCustomCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      showAlert("error", "Invalid Latitude / Longitude values.", "custom_coords");
      return;
    }

    if (latNum < 1 || latNum > 7 || lngNum < 99 || lngNum > 105) {
      showAlert("info", "Warning: Coordinates are outside Malaysia boundary.", "custom_coords");
    }

    setMockLocation(latNum, lngNum, customName.trim() || "Custom Pinpoint");
    setMockLocationActive(true);
    showAlert("success", `Updated location: [${latNum.toFixed(4)}, ${lngNum.toFixed(4)}]`, "custom_coords");
  };

  const handleNudge = (deltaLat: number, deltaLng: number, dirLabel: string) => {
    const newLat = mockData.lat + deltaLat;
    const newLng = mockData.lng + deltaLng;
    setMockLocation(newLat, newLng, `Nudge ${dirLabel} (~100m)`);
    setMockLocationActive(true);
    showAlert("info", `Nudged ${dirLabel} to [${newLat.toFixed(4)}, ${newLng.toFixed(4)}]`, "nudge");
  };

  const handleCopyCoords = () => {
    const text = `${mockData.lat.toFixed(6)}, ${mockData.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    showAlert("info", `Copied coordinates: ${text}`, "copy");
    setTimeout(() => setCopiedCoords(false), 1500);
  };

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Navigation Bar */}
      <DevNavBar activeTab="location" />

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Compass className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                Location & GPS Simulator
              </h1>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Simulate your device GPS position for nearest station detection, map pinpointing, and route testing.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setMockLocation(3.1342, 101.6861, "KL Sentral", 15);
                setMockLocationActive(true);
                showAlert("success", "Reset location to KL Sentral", "reset");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Reset to KL Sentral"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to KL Sentral</span>
            </button>
          </div>
        </div>

        {/* Stacked Floating Toast Alerts */}
        {toastList.length > 0 && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] sm:w-auto flex flex-col items-center gap-2 pointer-events-auto">
            {toastList.map((toast) => (
              <div
                key={toast.id}
                className={`px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xl backdrop-blur-xl transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
                  toast.type === "success"
                    ? "bg-card/95 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10"
                    : toast.type === "error"
                    ? "bg-card/95 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-rose-500/10"
                    : "bg-card/95 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-blue-500/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {toast.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : toast.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  ) : (
                    <Zap className="w-4 h-4 shrink-0 text-blue-500" />
                  )}
                  <span className="text-text-primary">{toast.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-text-secondary hover:text-text-primary text-xs p-1 transition-colors rounded-lg hover:bg-button-secondary ml-1"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* Card 1: GPS Mode Switch */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Simulation Status</span>
                <Compass className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-base font-bold text-text-primary">
                {mockData.enabled ? "Mock GPS Active" : "Device GPS Active"}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {mockData.enabled ? "Overriding geolocation API" : "Using real browser GPS"}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-mono">Toggle Override</span>
              <button
                type="button"
                role="switch"
                aria-checked={mockData.enabled}
                onClick={handleToggleActive}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mockData.enabled ? "bg-blue-600" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    mockData.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 2: Current Coordinates */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Simulated Position</span>
                <MapPin className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 font-mono text-sm font-bold text-text-primary truncate">
                {mockData.lat.toFixed(5)}, {mockData.lng.toFixed(5)}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                Accuracy: ±{mockData.accuracy}m
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={handleCopyCoords}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
              >
                {copiedCoords ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCoords ? "Copied" : "Copy Coordinates"}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Selected Landmark */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Location</span>
                <Navigation className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 text-sm font-bold text-text-primary truncate">
                {mockData.name}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Klang Valley Transit Region
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-mono">Status: Ready</span>
            </div>
          </div>

          {/* Card 4: Nearest Station */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Nearest Station</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-sm font-bold text-text-primary truncate">
                {nearestStationInfo ? nearestStationInfo.name : "Detecting..."}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Distance: {nearestStationInfo ? (nearestStationInfo.distance < 1000 ? `${Math.round(nearestStationInfo.distance)}m` : `${(nearestStationInfo.distance / 1000).toFixed(2)} km`) : "N/A"}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {nearestStationInfo?.codes.map((code) => (
                  <span
                    key={code}
                    className="px-1 py-0.2 rounded text-[9px] font-mono font-bold"
                    style={{
                      backgroundColor: `${getStationCodeColor(code)}18`,
                      color: getStationCodeColor(code),
                    }}
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Landmark Presets Grid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm mt-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                1-Click Landmark Teleport
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {PRESET_LANDMARKS.map((preset) => {
              const isSelected = mockData.name === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
                    isSelected
                      ? "bg-blue-600/10 border-blue-500/40 shadow-sm"
                      : "bg-button-secondary/50 hover:bg-button-secondary border-border/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">
                        {preset.tag}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                          Active ✓
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-text-primary">
                      {preset.name}
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-text-secondary">
                    {preset.lat.toFixed(4)}, {preset.lng.toFixed(4)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Coordinate Tuner & Nudge Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {/* Custom Coordinate Form */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Custom Coordinate Input
                </h2>
              </div>

              <form onSubmit={handleApplyCustomCoords} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">Location Label</label>
                  <input
                    type="text"
                    placeholder="e.g. My Office, Test Point A"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">Latitude</label>
                    <input
                      type="text"
                      placeholder="e.g. 3.1342"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">Longitude</label>
                    <input
                      type="text"
                      placeholder="e.g. 101.6861"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95"
                  >
                    Apply Coordinates & Activate
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Directional Nudge Tuner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-purple-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Micro-Adjustment (~100m Nudge)
                </h2>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Step your GPS position in cardinal directions to test boundaries and nearby transit stop transitions.
              </p>

              {/* Nudge D-Pad */}
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => handleNudge(0.001, 0, "North")}
                  className="px-4 py-2 rounded-xl bg-button-secondary hover:bg-button-secondary/80 border border-border text-xs font-bold text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                >
                  <ArrowUp className="w-4 h-4 text-blue-500" />
                  <span>North (+Lat)</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNudge(0, -0.001, "West")}
                    className="px-4 py-2 rounded-xl bg-button-secondary hover:bg-button-secondary/80 border border-border text-xs font-bold text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-blue-500" />
                    <span>West (-Lng)</span>
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs">
                    GPS
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNudge(0, 0.001, "East")}
                    className="px-4 py-2 rounded-xl bg-button-secondary hover:bg-button-secondary/80 border border-border text-xs font-bold text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <span>East (+Lng)</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(-0.001, 0, "South")}
                  className="px-4 py-2 rounded-xl bg-button-secondary hover:bg-button-secondary/80 border border-border text-xs font-bold text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                >
                  <ArrowDown className="w-4 h-4 text-blue-500" />
                  <span>South (-Lat)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Teleport to Any Transit Station */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm mt-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Teleport to Station ({filteredStations.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search station or code..."
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Line Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              onClick={() => setStationLineFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                stationLineFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-button-secondary text-text-secondary hover:text-text-primary"
              }`}
            >
              All Lines
            </button>
            {Object.entries(lines).map(([id, line]) => (
              <button
                key={id}
                onClick={() => setStationLineFilter(id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  stationLineFilter === id
                    ? "bg-card text-text-primary border border-border shadow-sm ring-1 ring-blue-500"
                    : "bg-button-secondary/70 text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                <span>{line.name.replace(" Line", "")}</span>
              </button>
            ))}
          </div>

          {/* Station List Table */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border bg-button-secondary/20">
            {filteredStations.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-secondary">
                No stations found matching &quot;{stationSearch}&quot;.
              </div>
            ) : (
              filteredStations.map((st) => {
                const isCurrent = mockData.name === st.name;
                return (
                  <div
                    key={st.name}
                    className="p-2.5 flex items-center justify-between hover:bg-button-secondary/50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-text-primary truncate">
                        {st.name} {st.zhName ? <span className="font-normal text-text-secondary">({st.zhName})</span> : null}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {st.codes.map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border"
                            style={{
                              backgroundColor: `${getStationCodeColor(code)}18`,
                              color: getStationCodeColor(code),
                              borderColor: `${getStationCodeColor(code)}35`,
                            }}
                          >
                            {code}
                          </span>
                        ))}
                        <span className="text-[10px] font-mono text-text-secondary ml-1">
                          {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMockLocation(st.lat, st.lng, st.name);
                        setMockLocationActive(true);
                        showAlert("success", `Teleported to ${st.name}`, "station_teleport");
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ml-2 ${
                        isCurrent
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95"
                      }`}
                    >
                      {isCurrent ? "Active ✓" : "Snap GPS"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 4: Fast Navigation Links */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm mt-5">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Test In Application Views
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="#/"
              className="p-3 rounded-xl bg-button-secondary/50 hover:bg-button-secondary border border-border flex items-center justify-between text-xs font-bold text-text-primary transition-all"
            >
              <span>Interactive Map (Pulsing Dot)</span>
              <span className="text-blue-500">→</span>
            </a>
            <a
              href="#/plan"
              className="p-3 rounded-xl bg-button-secondary/50 hover:bg-button-secondary border border-border flex items-center justify-between text-xs font-bold text-text-primary transition-all"
            >
              <span>Route Planner (Nearest Station)</span>
              <span className="text-blue-500">→</span>
            </a>
            <a
              href="#/bus"
              className="p-3 rounded-xl bg-button-secondary/50 hover:bg-button-secondary border border-border flex items-center justify-between text-xs font-bold text-text-primary transition-all"
            >
              <span>Bus Map (Nearby Stops)</span>
              <span className="text-blue-500">→</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};
