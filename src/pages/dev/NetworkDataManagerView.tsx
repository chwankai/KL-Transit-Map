import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DevNavBar } from "./DevNavBar";
import {
  Layers, MapPin, Search, Plus, Edit2, Trash2, Download,
  Upload, RefreshCw, Check, Copy, ExternalLink,
  CheckCircle2, AlertCircle, Zap, Eye,
  Sparkles, FileCode
} from "lucide-react";
import { stations as defaultStations, lines as defaultLines } from "../../lib/transit-data";
import type { Line, StationObj } from "../../lib/transit-data";
import { stationNamesZh as defaultStationNamesZh } from "../../lib/translations";
import defaultStationCoordsJson from "../../../public/station_coords.json";

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  text: string;
  category?: string;
}

interface EditableStation {
  name: string;
  zhName: string;
  codes: string[];
  lines: string[];
  lat: number;
  lng: number;
  facility?: string;
  isAccessible?: boolean;
}

interface EditableLine {
  id: string;
  name: string;
  color: string;
  length?: string;
  ridership?: string;
  hours?: string;
}

const STORAGE_KEYS = {
  STATION_OVERRIDES: "dev_network_station_overrides",
  LINE_OVERRIDES: "dev_network_line_overrides",
  COORDS_OVERRIDES: "dev_network_coords_overrides",
};

const getStationCodeColor = (code: string, currentLines: Record<string, Line>): string => {
  const prefix = code.replace(/[0-9]/g, "");
  if (currentLines[prefix]?.color) {
    return currentLines[prefix].color;
  }
  if (prefix === "KA" || prefix === "KB") return "#003b71";
  if (prefix === "KC") return "#0072bc";
  return "#2563eb";
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

export const NetworkDataManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"stations" | "lines" | "coords_json">("stations");

  // Overrides & active datasets
  const [stationsMap, setStationsMap] = useState<Record<string, StationObj>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATION_OVERRIDES);
      return saved ? JSON.parse(saved) : defaultStations;
    } catch {
      return defaultStations;
    }
  });

  const [linesMap, setLinesMap] = useState<Record<string, Line>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LINE_OVERRIDES);
      return saved ? JSON.parse(saved) : defaultLines;
    } catch {
      return defaultLines;
    }
  });

  const [coordsMap, setCoordsMap] = useState<Record<string, { lat: number; lng: number }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COORDS_OVERRIDES);
      return saved ? JSON.parse(saved) : (defaultStationCoordsJson as Record<string, { lat: number; lng: number }>);
    } catch {
      return defaultStationCoordsJson as Record<string, { lat: number; lng: number }>;
    }
  });

  const [stationZhMap, setStationZhMap] = useState<Record<string, string>>(() => defaultStationNamesZh);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineFilter, setSelectedLineFilter] = useState("all");
  const [filterInterchangesOnly, setFilterInterchangesOnly] = useState(false);
  const [filterMissingCoords, setFilterMissingCoords] = useState(false);

  // Modals & Editors
  const [editingStation, setEditingStation] = useState<EditableStation | null>(null);
  const [isAddingStation, setIsAddingStation] = useState(false);
  const [editingLine, setEditingLine] = useState<EditableLine | null>(null);
  const [previewStation, setPreviewStation] = useState<EditableStation | null>(null);
  const [selectedLineForSequence, setSelectedLineForSequence] = useState<string | null>("KJ");

  // Raw JSON editor state
  const [jsonText, setJsonText] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast Queue
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

  // Sync coords editor text when switching to JSON tab
  useEffect(() => {
    if (activeTab === "coords_json") {
      setJsonText(JSON.stringify(coordsMap, null, 2));
    }
  }, [activeTab, coordsMap]);

  // Combined station records list
  const allStationsList = useMemo<EditableStation[]>(() => {
    return Object.entries(stationsMap).map(([name, obj]) => {
      const coords = getStationCoordinate(name, coordsMap);
      return {
        name,
        zhName: stationZhMap[name] || "",
        codes: obj.codes || [],
        lines: obj.lines || [],
        lat: coords.lat,
        lng: coords.lng,
        facility: obj.facility,
        isAccessible: obj.isAccessible,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [stationsMap, coordsMap, stationZhMap]);

  // Filtered station list
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStationsList.filter((st) => {
      if (selectedLineFilter !== "all" && !st.lines.includes(selectedLineFilter)) {
        return false;
      }
      if (filterInterchangesOnly && st.lines.length < 2 && st.codes.length < 2) {
        return false;
      }
      if (filterMissingCoords && (st.lat !== 0 || st.lng !== 0)) {
        return false;
      }
      if (!q) return true;
      return (
        st.name.toLowerCase().includes(q) ||
        st.zhName.toLowerCase().includes(q) ||
        st.codes.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [allStationsList, searchQuery, selectedLineFilter, filterInterchangesOnly, filterMissingCoords]);

  // Count metrics
  const totalInterchanges = useMemo(() => {
    return allStationsList.filter((s) => s.lines.length >= 2 || s.codes.length >= 2).length;
  }, [allStationsList]);

  const hasOverrides = useMemo(() => {
    return !!(
      localStorage.getItem(STORAGE_KEYS.STATION_OVERRIDES) ||
      localStorage.getItem(STORAGE_KEYS.LINE_OVERRIDES) ||
      localStorage.getItem(STORAGE_KEYS.COORDS_OVERRIDES)
    );
  }, [stationsMap, linesMap, coordsMap]);

  // Save Station Changes
  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || !editingStation.name.trim()) return;

    const trimmedName = editingStation.name.trim();
    const upperName = trimmedName.toUpperCase();

    const updatedStations = {
      ...stationsMap,
      [trimmedName]: {
        name: trimmedName,
        codes: editingStation.codes,
        lines: editingStation.lines,
        connections: stationsMap[trimmedName]?.connections || [],
        facility: editingStation.facility,
        isAccessible: editingStation.isAccessible,
      },
    };

    const updatedCoords = {
      ...coordsMap,
      [upperName]: {
        lat: Number(editingStation.lat) || 0,
        lng: Number(editingStation.lng) || 0,
      },
    };

    const updatedZh = {
      ...stationZhMap,
      [trimmedName]: editingStation.zhName.trim(),
    };

    setStationsMap(updatedStations);
    setCoordsMap(updatedCoords);
    setStationZhMap(updatedZh);

    localStorage.setItem(STORAGE_KEYS.STATION_OVERRIDES, JSON.stringify(updatedStations));
    localStorage.setItem(STORAGE_KEYS.COORDS_OVERRIDES, JSON.stringify(updatedCoords));

    setEditingStation(null);
    setIsAddingStation(false);
    showAlert("success", `Saved station: ${trimmedName}`, "station_save");
  };

  // Delete Station
  const handleDeleteStation = (stationName: string) => {
    if (!window.confirm(`Are you sure you want to remove station "${stationName}"?`)) return;

    const updatedStations = { ...stationsMap };
    delete updatedStations[stationName];

    const updatedCoords = { ...coordsMap };
    delete updatedCoords[stationName.toUpperCase()];

    setStationsMap(updatedStations);
    setCoordsMap(updatedCoords);

    localStorage.setItem(STORAGE_KEYS.STATION_OVERRIDES, JSON.stringify(updatedStations));
    localStorage.setItem(STORAGE_KEYS.COORDS_OVERRIDES, JSON.stringify(updatedCoords));

    showAlert("info", `Removed station: ${stationName}`, "station_delete");
  };

  // Save Line Changes
  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine || !editingLine.id) return;

    const updatedLines = {
      ...linesMap,
      [editingLine.id]: {
        ...linesMap[editingLine.id],
        ...editingLine,
      },
    };

    setLinesMap(updatedLines);
    localStorage.setItem(STORAGE_KEYS.LINE_OVERRIDES, JSON.stringify(updatedLines));
    setEditingLine(null);
    showAlert("success", `Saved line: ${editingLine.name}`, "line_save");
  };

  // Save Raw JSON from Editor
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("JSON must be an object of station coordinates.");
      }
      setCoordsMap(parsed);
      localStorage.setItem(STORAGE_KEYS.COORDS_OVERRIDES, JSON.stringify(parsed));
      showAlert("success", `Updated coordinates for ${Object.keys(parsed).length} stations.`, "json_save");
    } catch (err) {
      showAlert("error", `Invalid JSON format: ${String(err)}`, "json_save");
    }
  };

  // Export File Helpers
  const handleExportCoordsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(coordsMap, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "station_coords.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showAlert("success", "Exported station_coords.json", "export");
  };

  const handleExportFullDataset = () => {
    const fullData = {
      exportedAt: new Date().toISOString(),
      lines: linesMap,
      stations: stationsMap,
      station_coords: coordsMap,
      translations_zh: stationZhMap,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "kl_transit_dataset.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showAlert("success", "Exported kl_transit_dataset.json", "export");
  };

  // Import JSON File
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.station_coords && parsed.stations && parsed.lines) {
          // Full dataset format
          setStationsMap(parsed.stations);
          setLinesMap(parsed.lines);
          setCoordsMap(parsed.station_coords);
          if (parsed.translations_zh) setStationZhMap(parsed.translations_zh);
          localStorage.setItem(STORAGE_KEYS.STATION_OVERRIDES, JSON.stringify(parsed.stations));
          localStorage.setItem(STORAGE_KEYS.LINE_OVERRIDES, JSON.stringify(parsed.lines));
          localStorage.setItem(STORAGE_KEYS.COORDS_OVERRIDES, JSON.stringify(parsed.station_coords));
          showAlert("success", "Imported full transit dataset.", "import");
        } else if (typeof parsed === "object") {
          // Check if it's station_coords.json
          const firstVal = Object.values(parsed)[0] as any;
          if (firstVal && typeof firstVal.lat === "number" && typeof firstVal.lng === "number") {
            setCoordsMap(parsed);
            localStorage.setItem(STORAGE_KEYS.COORDS_OVERRIDES, JSON.stringify(parsed));
            showAlert("success", `Imported coordinates for ${Object.keys(parsed).length} stations.`, "import");
          } else {
            showAlert("error", "Unrecognized JSON structure.", "import");
          }
        }
      } catch (err) {
        showAlert("error", `Import failed: ${String(err)}`, "import");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Reset to Defaults
  const handleResetToDefaults = () => {
    if (!window.confirm("Reset all station, line, and coordinate modifications back to defaults?")) return;

    localStorage.removeItem(STORAGE_KEYS.STATION_OVERRIDES);
    localStorage.removeItem(STORAGE_KEYS.LINE_OVERRIDES);
    localStorage.removeItem(STORAGE_KEYS.COORDS_OVERRIDES);

    setStationsMap(defaultStations);
    setLinesMap(defaultLines);
    setCoordsMap(defaultStationCoordsJson as Record<string, { lat: number; lng: number }>);
    setStationZhMap(defaultStationNamesZh);

    showAlert("info", "Reset all data to default codebase specifications.", "reset");
  };

  const handleCopyText = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    showAlert("info", `Copied: ${text}`, "copy");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Navigation Bar */}
      <DevNavBar activeTab="network" />

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                Stations & Lines Registry
              </h1>
              {hasOverrides && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Custom Overrides Active
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Inspect, modify, and export station coordinates, line sequences, transfer connections, and transit datasets.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCoordsJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Download station_coords.json"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Export coords.json</span>
            </button>

            <button
              onClick={handleExportFullDataset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Export complete transit dataset"
            >
              <Download className="w-3.5 h-3.5 text-purple-500" />
              <span>Export Full Data</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all cursor-pointer active:scale-95 shadow-sm">
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            {hasOverrides && (
              <button
                onClick={handleResetToDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95 shadow-sm"
                title="Reset all modifications to default"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-[11px] font-bold uppercase tracking-wider">Stations</span>
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-text-primary">
              {allStationsList.length}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Mapped in network graph
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-[11px] font-bold uppercase tracking-wider">Lines & Corridors</span>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-text-primary">
              {Object.keys(linesMap).length}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              LRT, MRT, Monorail, BRT
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-[11px] font-bold uppercase tracking-wider">Interchanges</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-text-primary">
              {totalInterchanges}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Multi-line transfer stations
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-[11px] font-bold uppercase tracking-wider">Coordinates</span>
              <FileCode className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-text-primary">
              {Object.keys(coordsMap).length}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              In station_coords.json
            </p>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-6 border-b border-border pb-3 overflow-x-auto no-scrollbar select-none -mx-1 px-1">
          <button
            onClick={() => setActiveTab("stations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "stations"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Stations Master ({allStationsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("lines")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "lines"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lines & Sequences ({Object.keys(linesMap).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("coords_json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "coords_json"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw coords.json Editor</span>
          </button>
        </div>

        {/* ── SUB-TAB 1: STATIONS MASTER REGISTRY ── */}
        {activeTab === "stations" && (
          <div className="space-y-4 mt-5">
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search station by name, Chinese, or code (e.g. KJ15, KL Sentral)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFilterInterchangesOnly(!filterInterchangesOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                    filterInterchangesOnly
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      : "bg-button-secondary text-text-secondary border-border hover:text-text-primary"
                  }`}
                >
                  Interchanges Only
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMissingCoords(!filterMissingCoords)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                    filterMissingCoords
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      : "bg-button-secondary text-text-secondary border-border hover:text-text-primary"
                  }`}
                >
                  Missing Coords
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingStation({
                    name: "",
                    zhName: "",
                    codes: [],
                    lines: ["KJ"],
                    lat: 3.1342,
                    lng: 101.6861,
                    facility: "",
                    isAccessible: true,
                  });
                  setIsAddingStation(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Station</span>
              </button>
            </div>

            {/* Line Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedLineFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                  selectedLineFilter === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-button-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                All Lines ({allStationsList.length})
              </button>
              {Object.entries(linesMap).map(([id, line]) => (
                <button
                  key={id}
                  onClick={() => setSelectedLineFilter(id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedLineFilter === id
                      ? "bg-card text-text-primary border border-border shadow-sm ring-1 ring-blue-500"
                      : "bg-button-secondary/70 text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                  <span>{line.name.replace(" Line", "")}</span>
                </button>
              ))}
            </div>

            {/* Stations Table */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      <th className="p-2.5">Station Name</th>
                      <th className="p-2.5">Codes</th>
                      <th className="p-2.5">Lines</th>
                      <th className="p-2.5">Coordinates [Lat, Lng]</th>
                      <th className="p-2.5">Accessibility</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {filteredStations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-secondary">
                          No stations found matching &quot;{searchQuery}&quot;.
                        </td>
                      </tr>
                    ) : (
                      filteredStations.map((st) => (
                        <tr key={st.name} className="hover:bg-button-secondary/30 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-text-primary">{st.name}</div>
                            {st.zhName && (
                              <div className="text-[11px] text-text-secondary font-normal">{st.zhName}</div>
                            )}
                          </td>

                          <td className="p-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {st.codes.map((c) => (
                                <span
                                  key={c}
                                  className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border"
                                  style={{
                                    backgroundColor: `${getStationCodeColor(c, linesMap)}18`,
                                    color: getStationCodeColor(c, linesMap),
                                    borderColor: `${getStationCodeColor(c, linesMap)}35`,
                                  }}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {st.lines.map((lId) => (
                                <span
                                  key={lId}
                                  className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-button-secondary text-text-primary border border-border"
                                >
                                  {lId}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-2.5 font-mono text-[11px]">
                            {st.lat !== 0 && st.lng !== 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-text-primary">
                                  {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                                </span>
                                <button
                                  onClick={() => handleCopyText(`${st.lat}, ${st.lng}`, st.name)}
                                  className="p-1 rounded hover:bg-button-secondary text-text-secondary hover:text-text-primary"
                                  title="Copy coordinates"
                                >
                                  {copiedKey === st.name ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="p-2.5">
                            <span className="text-[11px] text-text-secondary">
                              {st.isAccessible !== false ? "Wheelchair ✓" : "Standard"}
                            </span>
                          </td>

                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewStation(st)}
                                className="p-1.5 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-blue-500 transition-colors"
                                title="Quick Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingStation({ ...st });
                                  setIsAddingStation(false);
                                }}
                                className="p-1.5 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-text-primary transition-colors"
                                title="Edit Station"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteStation(st.name)}
                                className="p-1.5 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-rose-500 transition-colors"
                                title="Delete Station"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-TAB 2: LINES & SEQUENCES ── */}
        {activeTab === "lines" && (
          <div className="space-y-5 mt-5">
            {/* Lines Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {Object.entries(linesMap).map(([id, line]) => {
                const lineStations = allStationsList.filter((s) => s.lines.includes(id));
                const isSelected = selectedLineForSequence === id;

                return (
                  <div
                    key={id}
                    onClick={() => setSelectedLineForSequence(id)}
                    className={`p-4 rounded-2xl bg-card border cursor-pointer transition-all flex flex-col justify-between select-none ${
                      isSelected
                        ? "border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-blue-500/[0.03]"
                        : "border-border shadow-sm hover:border-blue-500/40 hover:shadow-md active:scale-[0.99]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: line.color }}
                          />
                          <span className="font-mono font-bold text-xs text-text-secondary">{id}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                              Active
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLine({ ...line });
                          }}
                          className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-text-primary transition-colors"
                          title="Edit Line Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 text-sm font-bold text-text-primary">{line.name}</div>

                      <div className="mt-2.5 space-y-1 text-[11px] text-text-secondary">
                        <div className="flex justify-between">
                          <span>Stations:</span>
                          <span className="font-mono font-bold text-text-primary">{lineStations.length}</span>
                        </div>
                        {line.length && (
                          <div className="flex justify-between">
                            <span>Track Length:</span>
                            <span className="font-mono text-text-primary">{line.length}</span>
                          </div>
                        )}
                        {line.ridership && (
                          <div className="flex justify-between">
                            <span>Ridership:</span>
                            <span className="font-mono text-text-primary">{line.ridership}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Station Sequence for Selected Line */}
            {selectedLineForSequence && (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm mt-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: linesMap[selectedLineForSequence]?.color }}
                    />
                    <h2 className="text-sm font-bold text-text-primary">
                      {linesMap[selectedLineForSequence]?.name} — Station Sequence (
                      {allStationsList.filter((s) => s.lines.includes(selectedLineForSequence)).length} Stations)
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {allStationsList
                    .filter((s) => s.lines.includes(selectedLineForSequence))
                    .map((st, idx) => (
                      <div
                        key={st.name}
                        className="p-3 rounded-xl bg-button-secondary/40 border border-border flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-text-secondary font-bold">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-text-primary truncate">
                              {st.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {st.codes.map((c) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold"
                                style={{
                                  backgroundColor: `${getStationCodeColor(c, linesMap)}18`,
                                  color: getStationCodeColor(c, linesMap),
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setPreviewStation(st)}
                          className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-blue-500"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUB-TAB 3: RAW COORDS.JSON EDITOR ── */}
        {activeTab === "coords_json" && (
          <div className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    Live JSON Editor (public/station_coords.json)
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Directly edit coordinates for all stations. Changes persist to local state and can be exported.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setJsonText(JSON.stringify(coordsMap, null, 2));
                      showAlert("info", "Formatted JSON.", "json_format");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border transition-all"
                  >
                    Format JSON
                  </button>

                  <button
                    onClick={handleSaveJson}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95"
                  >
                    Apply & Save
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={22}
                className="w-full p-3.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT / ADD STATION ── */}
        {editingStation && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingStation(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-text-primary">
                  {isAddingStation ? "Add New Transit Station" : `Edit Station: ${editingStation.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-none hover:bg-button-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStation} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Station Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStation.name}
                    onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="e.g. KL Sentral"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Chinese Name (ZH)
                  </label>
                  <input
                    type="text"
                    value={editingStation.zhName}
                    onChange={(e) => setEditingStation({ ...editingStation, zhName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 吉隆坡中央车站"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Station Codes (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editingStation.codes.join(", ")}
                    onChange={(e) =>
                      setEditingStation({
                        ...editingStation,
                        codes: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="e.g. KJ15, KG15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editingStation.lat || ""}
                      onChange={(e) => setEditingStation({ ...editingStation, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                      placeholder="3.1342"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editingStation.lng || ""}
                      onChange={(e) => setEditingStation({ ...editingStation, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                      placeholder="101.6861"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Assigned Transit Lines
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.keys(linesMap).map((lId) => {
                      const isAssigned = editingStation.lines.includes(lId);
                      return (
                        <button
                          key={lId}
                          type="button"
                          onClick={() => {
                            const newLines = isAssigned
                              ? editingStation.lines.filter((x) => x !== lId)
                              : [...editingStation.lines, lId];
                            setEditingStation({ ...editingStation, lines: newLines });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                            isAssigned
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-button-secondary text-text-secondary border-border hover:text-text-primary"
                          }`}
                        >
                          {lId}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStation(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    Save Station
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT LINE ── */}
        {editingLine && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingLine(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-text-primary">
                  Edit Line: {editingLine.id}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-none hover:bg-button-secondary text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLine} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Line Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLine.name}
                    onChange={(e) => setEditingLine({ ...editingLine, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                    Line Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingLine.color}
                      onChange={(e) => setEditingLine({ ...editingLine, color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0"
                    />
                    <input
                      type="text"
                      value={editingLine.color}
                      onChange={(e) => setEditingLine({ ...editingLine, color: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Length
                    </label>
                    <input
                      type="text"
                      value={editingLine.length || ""}
                      onChange={(e) => setEditingLine({ ...editingLine, length: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 46.4 km"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Ridership
                    </label>
                    <input
                      type="text"
                      value={editingLine.ridership || ""}
                      onChange={(e) => setEditingLine({ ...editingLine, ridership: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 286,000"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLine(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    Save Line
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: STATION PREVIEW ── */}
        {previewStation && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewStation(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-text-primary">{previewStation.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewStation(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-none hover:bg-button-secondary text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {previewStation.zhName && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-text-secondary font-medium">Chinese:</span>
                    <span className="font-bold text-text-primary">{previewStation.zhName}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary font-medium">Codes:</span>
                  <div className="flex gap-1">
                    {previewStation.codes.map((c) => (
                      <span
                        key={c}
                        className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
                        style={{
                          backgroundColor: `${getStationCodeColor(c, linesMap)}18`,
                          color: getStationCodeColor(c, linesMap),
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary font-medium">Coordinates:</span>
                  <span className="font-mono text-text-primary">
                    {previewStation.lat.toFixed(6)}, {previewStation.lng.toFixed(6)}
                  </span>
                </div>

                <div>
                  <span className="text-text-secondary font-medium block mb-1.5">Floor Plan / Directory Map:</span>
                  <div className="rounded-xl border border-border overflow-hidden bg-button-secondary/30 p-1 flex items-center justify-center min-h-[140px]">
                    <img
                      src={`/location map/${encodeURIComponent(previewStation.name)}.webp`}
                      alt={previewStation.name}
                      className="max-h-48 w-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  href={`#/station/${encodeURIComponent(previewStation.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-button-secondary hover:bg-button-secondary/80 text-text-primary flex items-center gap-1.5"
                >
                  <span>Open Station Detail Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
