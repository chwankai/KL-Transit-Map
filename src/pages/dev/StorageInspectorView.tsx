import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DevNavBar } from "./DevNavBar";
import {
  Database, HardDrive, RefreshCw, Trash2, Download, Upload,
  Wifi, WifiOff, ShieldCheck, AlertTriangle, Layers,
  Star, BookmarkCheck, Settings, Key, Check, Copy, Plus,
  FileCode, AlertCircle, CheckCircle2, XCircle, Zap, Search, MapPin,
  Image as ImageIcon
} from "lucide-react";
import { stations, lines } from "../../lib/transit-data";
import { stationNamesZh } from "../../lib/translations";
import {
  isSimulatedOffline as getSimulatedOffline,
  toggleSimulatedOffline as doToggleSimulatedOffline
} from "../../lib/offlineSimulator";

// Storage keys
const STORAGE_KEYS = {
  FAVOURITES: "favourite_stations",
  SAVED_ROUTES: "saved_routes",
  THEME: "theme_preference",
  FARE: "fare_display_preference",
  BUS_BUTTON: "hide_bus_button",
  LANGUAGE: "language_preference",
  CACHE_DIRECTORIES: "dev_cache_station_directories",
};

// Essential app assets
const ESSENTIAL_ASSETS = [
  { url: "/", name: "App Root / Index" },
  { url: "/index.html", name: "HTML Shell" },
  { url: "/station_coords.json", name: "Station Coordinates" },
  { url: "/station_schedules.json", name: "Station Schedules" },
  { url: "/rail_tracks.json", name: "Rail Tracks GeoJSON" },
  { url: "/gtfs_data.json", name: "GTFS Rail Data" },
  { url: "/rapid_bus_data.json", name: "Rapid Bus Routes" },
  { url: "/manifest.json", name: "Web App Manifest" },
  { url: "/images/favicon.png", name: "App Icon" },
];

interface CachedItem {
  url: string;
  cacheName: string;
  sizeBytes?: number;
  contentType?: string;
  status?: number;
}

interface SavedRoute {
  id?: string;
  origin?: string;
  dest?: string;
  destination?: string;
  date?: string;
  time?: string;
  totalDuration?: number;
  fare?: number;
  transfers?: number;
  [key: string]: unknown;
}

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

export const StorageInspectorView: React.FC = () => {
  // Navigation & Active Tab
  const [activeSection, setActiveSection] = useState<"overview" | "localstorage" | "caches" | "offline_audit" | "backup">("overview");

  // Storage Quota State
  const [quotaInfo, setQuotaInfo] = useState<{ usage: number; quota: number; percent: number } | null>(null);

  // LocalStorage State
  const [localStorageEntries, setLocalStorageEntries] = useState<{ key: string; value: string; size: number }[]>([]);
  const [favouriteStations, setFavouriteStations] = useState<string[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [userPrefs, setUserPrefs] = useState<{
    theme: string;
    fare: string;
    hideBus: string;
    language: string;
  }>({ theme: "system", fare: "all", hideBus: "true", language: "en" });

  // Station Directory Caching Preference
  const [cacheDirectories, setCacheDirectories] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CACHE_DIRECTORIES) === "true";
  });

  // Cache Storage State
  const [cacheNames, setCacheNames] = useState<string[]>([]);
  const [cachedItems, setCachedItems] = useState<CachedItem[]>([]);
  const [selectedCache, setSelectedCache] = useState<string>("");
  const [isLoadingCaches, setIsLoadingCaches] = useState(false);

  // Service Worker State
  const [swStatus, setSwStatus] = useState<{
    supported: boolean;
    registered: boolean;
    state: string;
    scope?: string;
    scriptUrl?: string;
  }>({ supported: false, registered: false, state: "unknown" });

  // Network & Simulated Offline
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine && !getSimulatedOffline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => getSimulatedOffline());

  // Offline Audit State
  const [auditResults, setAuditResults] = useState<{
    url: string;
    name: string;
    cached: boolean;
    size?: number;
  }[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number | null>(null);

  // Modals & Stacked Toast Feedback
  const [toastList, setToastList] = useState<ToastItem[]>([]);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingKey, setEditingKey] = useState<{ key: string; value: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showNuclearModal, setShowNuclearModal] = useState(false);

  // Station Selector Modal
  const [showStationPickerModal, setShowStationPickerModal] = useState(false);
  const [stationSearchQuery, setStationSearchQuery] = useState("");
  const [stationLineFilter, setStationLineFilter] = useState("all");

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

  // 1. Refresh LocalStorage snapshot
  const refreshLocalStorage = useCallback(() => {
    try {
      const entries: { key: string; value: string; size: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const val = localStorage.getItem(k) || "";
          const size = new Blob([k + val]).size;
          entries.push({ key: k, value: val, size });
        }
      }
      setLocalStorageEntries(entries);

      // Load specific keys
      const favs = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
      if (favs) {
        try {
          const parsed = JSON.parse(favs);
          if (Array.isArray(parsed)) setFavouriteStations(parsed);
        } catch {
          // ignore
        }
      } else {
        setFavouriteStations([]);
      }

      const routes = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
      if (routes) {
        try {
          const parsed = JSON.parse(routes);
          if (Array.isArray(parsed)) setSavedRoutes(parsed);
        } catch {
          // ignore
        }
      } else {
        setSavedRoutes([]);
      }

      setUserPrefs({
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || "system",
        fare: localStorage.getItem(STORAGE_KEYS.FARE) || "all",
        hideBus: localStorage.getItem(STORAGE_KEYS.BUS_BUTTON) || "true",
        language: localStorage.getItem(STORAGE_KEYS.LANGUAGE) || "en",
      });
    } catch (e) {
      console.error("Failed to read localStorage:", e);
    }
  }, []);

  // 2. Storage estimate
  const refreshStorageEstimate = useCallback(async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usage = est.usage || 0;
        const quota = est.quota || 1;
        setQuotaInfo({
          usage,
          quota,
          percent: Math.min(100, Math.round((usage / quota) * 100)),
        });
      } catch (e) {
        console.error("Storage estimation error:", e);
      }
    }
  }, []);

  // 3. Cache Storage snapshot
  const refreshCaches = useCallback(async () => {
    if (!("caches" in window)) return;
    setIsLoadingCaches(true);
    try {
      const keys = await caches.keys();
      setCacheNames(keys);
      if (keys.length > 0 && !selectedCache) {
        setSelectedCache(keys[0]);
      }

      const items: CachedItem[] = [];
      for (const cName of keys) {
        const cache = await caches.open(cName);
        const requests = await cache.keys();
        for (const req of requests) {
          let sizeBytes = 0;
          let contentType = "";
          let status = 200;
          try {
            const resp = await cache.match(req);
            if (resp) {
              status = resp.status;
              contentType = resp.headers.get("content-type") || "";
              const blob = await resp.clone().blob();
              sizeBytes = blob.size;
            }
          } catch {
            // ignore
          }
          items.push({
            url: req.url,
            cacheName: cName,
            sizeBytes,
            contentType,
            status,
          });
        }
      }
      setCachedItems(items);
    } catch (e) {
      console.error("Failed to read CacheStorage:", e);
    } finally {
      setIsLoadingCaches(false);
    }
  }, [selectedCache]);

  // 4. Service Worker info
  const refreshServiceWorker = useCallback(() => {
    if (!("serviceWorker" in navigator)) {
      setSwStatus({ supported: false, registered: false, state: "unsupported" });
      return;
    }

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        const sw = reg.active || reg.installing || reg.waiting;
        setSwStatus({
          supported: true,
          registered: true,
          state: sw ? sw.state : "registered",
          scope: reg.scope,
          scriptUrl: sw ? sw.scriptURL : undefined,
        });
      } else {
        setSwStatus({
          supported: true,
          registered: false,
          state: "inactive",
        });
      }
    }).catch(() => {
      setSwStatus({ supported: true, registered: false, state: "error" });
    });
  }, []);

  // 5. Offline Audit: check which essential resources are in CacheStorage
  const runOfflineAudit = useCallback(async () => {
    if (!("caches" in window)) return;
    setIsAuditing(true);
    try {
      const results: { url: string; name: string; cached: boolean; size?: number }[] = [];
      let cachedCount = 0;

      for (const asset of ESSENTIAL_ASSETS) {
        const match = await caches.match(asset.url);
        if (match) {
          cachedCount++;
          let size = 0;
          try {
            const blob = await match.clone().blob();
            size = blob.size;
          } catch {
            // ignore
          }
          results.push({ url: asset.url, name: asset.name, cached: true, size });
        } else {
          results.push({ url: asset.url, name: asset.name, cached: false });
        }
      }

      setAuditResults(results);
      const score = Math.round((cachedCount / ESSENTIAL_ASSETS.length) * 100);
      setAuditScore(score);
    } catch (e) {
      console.error("Offline audit failed:", e);
    } finally {
      setIsAuditing(false);
    }
  }, []);

  // Precache all essential assets into Cache Storage
  const handlePrecacheAll = async () => {
    if (!("caches" in window)) {
      showAlert("error", "Cache API is not supported in this browser.", "cache");
      return;
    }
    try {
      const cache = await caches.open("kv-map-cache-v3");
      const urls = ESSENTIAL_ASSETS.map((a) => a.url);

      if (cacheDirectories) {
        Object.keys(stations).forEach((stName) => {
          urls.push(`/location map/${encodeURIComponent(stName)}.webp`);
        });
      }

      showAlert("info", `Downloading ${urls.length} files into cache...`, "cache");
      await cache.addAll(urls);
      await refreshCaches();
      await runOfflineAudit();
      showAlert("success", "All essential assets are now cached!", "cache");
    } catch (err) {
      showAlert("error", `Failed to cache assets: ${String(err)}`, "cache");
    }
  };

  // Clear station directory floor plans from cache
  const handleClearCachedDirectories = async () => {
    if (!("caches" in window)) return;
    try {
      const keys = await caches.keys();
      let count = 0;
      for (const k of keys) {
        const cache = await caches.open(k);
        const reqs = await cache.keys();
        for (const req of reqs) {
          if (req.url.includes("/location%20map/") || req.url.includes("/location map/")) {
            await cache.delete(req);
            count++;
          }
        }
      }
      await refreshCaches();
      showAlert("success", `Removed ${count} cached directory images.`, "directory_cache");
    } catch (err) {
      showAlert("error", `Failed to clear directory images: ${String(err)}`, "directory_cache");
    }
  };

  // Toggle station directory caching preference
  const handleToggleCacheDirectories = () => {
    const next = !cacheDirectories;
    setCacheDirectories(next);
    localStorage.setItem(STORAGE_KEYS.CACHE_DIRECTORIES, next ? "true" : "false");
    showAlert(
      "info",
      next ? "Station directories will be cached." : "Station directories skipped from cache.",
      "directory_cache"
    );
  };

  // Toggle simulated offline
  const toggleSimulatedOffline = () => {
    const nextState = doToggleSimulatedOffline();
    setIsSimulatedOffline(nextState);
    setIsOnline(navigator.onLine && !nextState);
    if (nextState) {
      showAlert("info", "Offline mode active (Network intercepted).", "network_mode");
    } else {
      showAlert("success", "Normal network connection restored.", "network_mode");
    }
  };

  // Initial Load & Event Listeners
  useEffect(() => {
    refreshLocalStorage();
    refreshStorageEstimate();
    refreshServiceWorker();
    refreshCaches();
    runOfflineAudit();

    const handleOnline = () => {
      if (!getSimulatedOffline()) {
        setIsOnline(true);
      }
    };
    const handleOffline = () => setIsOnline(false);
    const handleSimulatedChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      const isSim = customEvent.detail ? customEvent.detail.enabled : getSimulatedOffline();
      setIsSimulatedOffline(isSim);
      setIsOnline(navigator.onLine && !isSim);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", refreshLocalStorage);
    window.addEventListener("simulated_offline_change", handleSimulatedChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", refreshLocalStorage);
      window.removeEventListener("simulated_offline_change", handleSimulatedChange);
    };
  }, [refreshLocalStorage, refreshStorageEstimate, refreshServiceWorker, refreshCaches, runOfflineAudit]);

  // LocalStorage Actions
  const handleUpdatePref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    refreshLocalStorage();
    showAlert("success", `Updated preference: ${key}`);
  };

  const handleDeleteStorageKey = (key: string) => {
    localStorage.removeItem(key);
    refreshLocalStorage();
    showAlert("info", `Removed key: ${key}`);
  };

  const handleSaveCustomKey = () => {
    if (!newKey.trim()) return;
    localStorage.setItem(newKey.trim(), newValue);
    setNewKey("");
    setNewValue("");
    setShowAddKeyModal(false);
    refreshLocalStorage();
    showAlert("success", `Saved: ${newKey}`);
  };

  const handleUpdateExistingKey = () => {
    if (!editingKey) return;
    localStorage.setItem(editingKey.key, editingKey.value);
    setEditingKey(null);
    refreshLocalStorage();
    showAlert("success", `Updated: ${editingKey.key}`);
  };

  const handleRemoveFavouriteStation = (station: string) => {
    const updated = favouriteStations.filter((s) => s !== station);
    localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(updated));
    setFavouriteStations(updated);
    refreshLocalStorage();
    showAlert("info", `Removed station: ${station}`);
  };

  const handleAddFavouriteStation = (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    if (favouriteStations.includes(cleanName)) {
      showAlert("info", `"${cleanName}" is already in favorites.`);
      return;
    }
    const updated = [...favouriteStations, cleanName];
    localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(updated));
    setFavouriteStations(updated);
    refreshLocalStorage();
    showAlert("success", `Added station: ${cleanName}`);
  };

  const PRESET_ROUTES: SavedRoute[] = [
    {
      id: "route_1",
      origin: "KL Sentral",
      dest: "KLCC",
      destination: "KLCC",
      date: new Date().toISOString().split("T")[0],
      time: "08:30",
      totalDuration: 18,
      fare: 2.8,
      transfers: 0,
    },
    {
      id: "route_2",
      origin: "Bukit Bintang",
      dest: "Pasar Seni",
      destination: "Pasar Seni",
      date: new Date().toISOString().split("T")[0],
      time: "14:15",
      totalDuration: 6,
      fare: 1.6,
      transfers: 0,
    },
    {
      id: "route_3",
      origin: "Pasar Seni",
      dest: "Tun Razak Exchange (TRX)",
      destination: "Tun Razak Exchange (TRX)",
      date: new Date().toISOString().split("T")[0],
      time: "12:00",
      totalDuration: 7,
      fare: 1.8,
      transfers: 0,
    },
    {
      id: "route_4",
      origin: "KL Sentral",
      dest: "Putrajaya Sentral",
      destination: "Putrajaya Sentral",
      date: new Date().toISOString().split("T")[0],
      time: "17:45",
      totalDuration: 38,
      fare: 8.5,
      transfers: 1,
    },
  ];

  const handleAddPresetRoute = (preset: SavedRoute) => {
    const presetDest = preset.dest || preset.destination || "";
    const isDup = savedRoutes.some(
      (r) => r.origin === preset.origin && (r.dest || r.destination) === presetDest
    );
    if (isDup) {
      showAlert("info", `Route "${preset.origin} → ${presetDest}" already exists.`);
      return;
    }
    const newRoute: SavedRoute = {
      ...preset,
      dest: presetDest,
      destination: presetDest,
      id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    const updated = [...savedRoutes, newRoute];
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(updated));
    setSavedRoutes(updated);
    refreshLocalStorage();
    showAlert("success", `Added route: ${preset.origin} → ${presetDest}`);
  };

  const handleDeleteSavedRoute = (index: number) => {
    const updated = [...savedRoutes];
    updated.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(updated));
    setSavedRoutes(updated);
    refreshLocalStorage();
    showAlert("info", "Removed saved route.");
  };

  // Seed Realistic Mock Transit Data
  const handleSeedMockData = () => {
    const sampleFavourites = [
      "KL Sentral",
      "Pasar Seni",
      "Bukit Bintang",
      "Tun Razak Exchange (TRX)",
      "KLCC",
      "Masjid Jamek"
    ];

    const sampleRoutes: SavedRoute[] = [
      {
        id: "route_1",
        origin: "KL Sentral",
        destination: "KLCC",
        date: new Date().toISOString().split("T")[0],
        time: "08:30",
        totalDuration: 18,
        fare: 2.8,
        transfers: 0,
      },
      {
        id: "route_2",
        origin: "Bukit Bintang",
        destination: "Pasar Seni",
        date: new Date().toISOString().split("T")[0],
        time: "14:15",
        totalDuration: 6,
        fare: 1.6,
        transfers: 0,
      }
    ];

    localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(sampleFavourites));
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(sampleRoutes));
    localStorage.setItem(STORAGE_KEYS.THEME, "system");
    localStorage.setItem(STORAGE_KEYS.FARE, "cashless");
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, "en");

    refreshLocalStorage();
    showAlert("success", "Sample data seeded.");
  };

  // Cache Actions
  const handleDeleteCacheItem = async (cacheName: string, url: string) => {
    try {
      const cache = await caches.open(cacheName);
      await cache.delete(url);
      await refreshCaches();
      showAlert("info", `Deleted cached item.`);
    } catch (err) {
      showAlert("error", `Failed to delete item: ${String(err)}`);
    }
  };

  const handlePurgeCache = async (cacheName: string) => {
    try {
      await caches.delete(cacheName);
      await refreshCaches();
      await runOfflineAudit();
      showAlert("success", `Cache deleted: ${cacheName}`);
    } catch (err) {
      showAlert("error", `Failed to delete cache: ${String(err)}`);
    }
  };

  // Service Worker Controls
  const handleCheckSwUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        await registrations[0].update();
        showAlert("success", "Service Worker update checked.");
      } else {
        showAlert("info", "No active Service Worker.");
      }
    } catch (err) {
      showAlert("error", `Check failed: ${String(err)}`);
    }
  };

  const handleUnregisterSw = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      await refreshServiceWorker();
      showAlert("info", "Service Worker unregistered.");
    } catch (err) {
      showAlert("error", `Failed to unregister: ${String(err)}`);
    }
  };

  const handleRegisterSw = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("/sw.js");
      await refreshServiceWorker();
      showAlert("success", "Service Worker registered.");
    } catch (err) {
      showAlert("error", `Registration failed: ${String(err)}`);
    }
  };

  // Nuclear Action: Purge everything
  const handleNuclearPurge = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      setShowNuclearModal(false);
      refreshLocalStorage();
      await refreshCaches();
      await refreshServiceWorker();
      await runOfflineAudit();
      showAlert("success", "All storage and caches have been cleared.");
    } catch (err) {
      showAlert("error", `Failed to clear storage: ${String(err)}`);
    }
  };

  // Export State as JSON
  const handleExportState = () => {
    const backup: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        backup[k] = localStorage.getItem(k) || "";
      }
    }
    const exportData = {
      timestamp: new Date().toISOString(),
      localStorage: backup,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storage-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("success", "Exported backup JSON.");
  };

  // Import State from JSON
  const handleImportState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const data = json.localStorage || json;
        if (typeof data === "object" && data !== null) {
          let count = 0;
          Object.entries(data).forEach(([k, v]) => {
            if (typeof v === "string") {
              localStorage.setItem(k, v);
              count++;
            } else {
              localStorage.setItem(k, JSON.stringify(v));
              count++;
            }
          });
          refreshLocalStorage();
          showAlert("success", `Imported ${count} keys.`);
        } else {
          showAlert("error", "Invalid JSON format.");
        }
      } catch (err) {
        showAlert("error", `Import failed: ${String(err)}`);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalLocalStorageSize = useMemo(() => {
    return localStorageEntries.reduce((acc, curr) => acc + curr.size, 0);
  }, [localStorageEntries]);

  const totalCacheSize = useMemo(() => {
    return cachedItems.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  }, [cachedItems]);

  // Filtered station list for the Station Picker Modal
  const allAvailableStations = useMemo(() => {
    return Object.entries(stations).map(([name, data]) => ({
      name,
      zhName: stationNamesZh[name] || "",
      lines: data.lines || [],
      codes: data.codes || [],
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredStationsForPicker = useMemo(() => {
    const q = stationSearchQuery.trim().toLowerCase();
    return allAvailableStations.filter((st) => {
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
  }, [allAvailableStations, stationSearchQuery, stationLineFilter]);

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Navigation Bar */}
      <DevNavBar activeTab="storage" />

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <HardDrive className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                Storage & Cache Inspector
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Inspect and manage client-side state, localStorage, cached files, and offline mode.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                refreshLocalStorage();
                refreshStorageEstimate();
                refreshServiceWorker();
                refreshCaches();
                runOfflineAudit();
                showAlert("success", "Refreshed.");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSeedMockData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95 shadow-sm"
              title="Map sample data"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Map Sample Data</span>
            </button>

            <button
              onClick={() => setShowNuclearModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95 shadow-sm"
              title="Clear all storage"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
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

        {/* Top Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* Card 1: Storage Space */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Storage Space</span>
              <HardDrive className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-extrabold text-text-primary">
                {quotaInfo ? formatBytes(quotaInfo.usage) : "Checking..."}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                of {quotaInfo ? formatBytes(quotaInfo.quota) : "N/A"} allocated
              </p>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-button-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, quotaInfo?.percent || 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-text-secondary mt-1">
                <span>{quotaInfo?.percent || 0}% used</span>
                <span>Browser Quota</span>
              </div>
            </div>
          </div>

          {/* Card 2: Local Storage */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Local Storage</span>
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-extrabold text-text-primary">{localStorageEntries.length} Keys</div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Size: <span className="text-text-primary font-semibold">{formatBytes(totalLocalStorageSize)}</span>
              </p>
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-text-secondary">
              <span>{favouriteStations.length} Favorites</span>
              <span>•</span>
              <span>{savedRoutes.length} Routes</span>
            </div>
          </div>

          {/* Card 3: Cache Storage */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Cache Files</span>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-extrabold text-text-primary">
                {isLoadingCaches ? "Scanning..." : `${cachedItems.length} Assets`}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Size: <span className="text-text-primary font-semibold">{formatBytes(totalCacheSize)}</span>
              </p>
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-text-secondary">
              <span className="truncate max-w-[120px]">{cacheNames[0] || "No cache"}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{auditScore !== null ? `${auditScore}% Ready` : "Audited"}</span>
            </div>
          </div>

          {/* Card 4: Network & Service Worker */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Network & Worker</span>
              {isOnline && !isSimulatedOffline ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="mt-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    swStatus.registered ? "bg-emerald-500" : "bg-text-secondary"
                  }`}
                />
                <span className="text-sm font-bold text-text-primary capitalize">
                  {swStatus.registered ? `Service Worker ${swStatus.state}` : "Worker Inactive"}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Network:{" "}
                <span className={isSimulatedOffline ? "text-amber-500 font-bold" : isOnline ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                  {isSimulatedOffline ? "Simulated Offline" : isOnline ? "Online" : "Offline"}
                </span>
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-mono">
                Simulate Offline
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isSimulatedOffline}
                onClick={toggleSimulatedOffline}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSimulatedOffline ? "bg-blue-600" : "bg-border"
                }`}
                title={isSimulatedOffline ? "Disable offline simulation" : "Enable offline simulation"}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isSimulatedOffline ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border mt-6 pb-2.5 overflow-x-auto no-scrollbar select-none -mx-1 px-1">
          <button
            onClick={() => setActiveSection("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "overview"
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveSection("localstorage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "localstorage"
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>LocalStorage</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-500/10 text-purple-500 font-mono">
              {localStorageEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("caches")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "caches"
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cache Storage</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/10 text-emerald-500 font-mono">
              {cachedItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("offline_audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "offline_audit"
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Offline Test</span>
            {auditScore !== null && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-500/10 text-blue-500 font-mono font-bold">
                {auditScore}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection("backup")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "backup"
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Reset</span>
          </button>
        </div>

        {/* ── SECTION 1: OVERVIEW ── */}
        {activeSection === "overview" && (
          <div className="space-y-5 mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Storage Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Client Storage Details
                </h2>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-button-secondary/50 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="text-xs font-semibold text-text-primary">Favorites</div>
                        <div className="text-[10px] text-text-secondary">favourite_stations</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-text-primary">{favouriteStations.length} stations</div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-button-secondary/50 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <BookmarkCheck className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-xs font-semibold text-text-primary">Saved Routes</div>
                        <div className="text-[10px] text-text-secondary">saved_routes</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-text-primary">{savedRoutes.length} routes</div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-button-secondary/50 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-xs font-semibold text-text-primary">Preferences</div>
                        <div className="text-[10px] text-text-secondary">theme, fare, lang, bus button</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-text-secondary">
                      {userPrefs.theme} • {userPrefs.fare} • {userPrefs.language}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-button-secondary/50 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="text-xs font-semibold text-text-primary">Cache Bucket</div>
                        <div className="text-[10px] text-text-secondary">{cacheNames[0] || "None"}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {cachedItems.length} files ({formatBytes(totalCacheSize)})
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Worker Info */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Service Worker Status
                  </h2>

                  <div className="p-3 rounded-xl bg-button-secondary/50 border border-border/60 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Support:</span>
                      <span className={swStatus.supported ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-500"}>
                        {swStatus.supported ? "Supported" : "Unsupported"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">State:</span>
                      <span className="font-mono font-bold text-text-primary uppercase text-[11px]">
                        {swStatus.state}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Script:</span>
                      <span className="text-text-primary font-mono">{swStatus.scriptUrl || "none"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Scope:</span>
                      <span className="text-text-primary font-mono">{swStatus.scope || "none"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                  <button
                    onClick={handleCheckSwUpdate}
                    className="flex-1 min-w-[110px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border transition-all"
                  >
                    Check Update
                  </button>
                  <button
                    onClick={handleRegisterSw}
                    className="flex-1 min-w-[110px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all"
                  >
                    Register / Reload
                  </button>
                  <button
                    onClick={handleUnregisterSw}
                    className="flex-1 min-w-[110px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all"
                  >
                    Unregister
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: LOCALSTORAGE ── */}
        {activeSection === "localstorage" && (
          <div className="space-y-5 mt-5">
            {/* 1. Favorite Stations */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Favorite Stations ({favouriteStations.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStationPickerModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Select Station</span>
                  </button>

                  {favouriteStations.length > 0 && (
                    <button
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEYS.FAVOURITES);
                        setFavouriteStations([]);
                        refreshLocalStorage();
                        showAlert("info", "Cleared favorites.");
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl transition-all hover:bg-rose-500/20 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {favouriteStations.length === 0 ? (
                <div className="py-5 text-center text-xs text-text-secondary bg-button-secondary/30 rounded-xl border border-dashed border-border">
                  No favorite stations saved. Click &quot;Select Station&quot; on the top right to bookmark stations.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {favouriteStations.map((stName, i) => {
                    const stationData = stations[stName];
                    const codes = stationData?.codes || [];
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-button-secondary border border-border text-xs text-text-primary group shadow-sm"
                      >
                        {codes.length > 0 && (
                          <div className="flex items-center gap-1">
                            {codes.map((code) => {
                              const color = getStationCodeColor(code);
                              return (
                                <span
                                  key={code}
                                  className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border"
                                  style={{
                                    backgroundColor: `${color}18`,
                                    color: color,
                                    borderColor: `${color}35`,
                                  }}
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="font-semibold">{stName}</span>
                        <button
                          onClick={() => handleRemoveFavouriteStation(stName)}
                          className="text-text-secondary hover:text-rose-500 transition-colors p-0.5 ml-0.5"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Saved Routes */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Saved Routes ({savedRoutes.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-text-secondary font-semibold mr-1 hidden sm:inline">Add Preset:</span>
                  {PRESET_ROUTES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAddPresetRoute(preset)}
                      className="px-2 py-1 rounded-lg bg-button-secondary hover:bg-button-secondary/80 border border-border text-[10px] font-semibold text-text-primary transition-all active:scale-95"
                      title={`Add ${preset.origin} → ${preset.destination}`}
                    >
                      + {preset.origin} → {preset.destination}
                    </button>
                  ))}
                  {savedRoutes.length > 0 && (
                    <button
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEYS.SAVED_ROUTES);
                        setSavedRoutes([]);
                        refreshLocalStorage();
                        showAlert("info", "Cleared routes.");
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg transition-all hover:bg-rose-500/20 font-semibold ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {savedRoutes.length === 0 ? (
                <div className="py-5 text-center text-xs text-text-secondary bg-button-secondary/30 rounded-xl border border-dashed border-border">
                  No saved routes found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {savedRoutes.map((route, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-button-secondary/50 border border-border flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 font-bold">
                            #{idx + 1}
                          </span>
                          <button
                            onClick={() => handleDeleteSavedRoute(idx)}
                            className="text-text-secondary hover:text-rose-500 p-0.5 transition-colors"
                            title="Delete route"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <span className="truncate">{route.origin || "Origin"}</span>
                          <span className="text-blue-500">→</span>
                          <span className="truncate">{route.dest || route.destination || "Destination"}</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-text-secondary space-y-0.5">
                          {route.totalDuration !== undefined && (
                            <div>Time: <strong className="text-text-primary">{route.totalDuration} mins</strong></div>
                          )}
                          {route.fare !== undefined && (
                            <div>Fare: <strong className="text-text-primary">RM {route.fare}</strong></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. User Preferences */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-3.5">
                <Settings className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">App Preferences</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Theme */}
                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border">
                  <div className="text-xs font-semibold text-text-primary mb-1.5">Theme</div>
                  <select
                    value={userPrefs.theme}
                    onChange={(e) => handleUpdatePref(STORAGE_KEYS.THEME, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="system">System</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                {/* Fare Preference */}
                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border">
                  <div className="text-xs font-semibold text-text-primary mb-1.5">Fare Mode</div>
                  <select
                    value={userPrefs.fare}
                    onChange={(e) => handleUpdatePref(STORAGE_KEYS.FARE, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All (Cash & Cashless)</option>
                    <option value="cashless">Cashless Only</option>
                    <option value="cash">Cash Only</option>
                    <option value="concession">Concession</option>
                  </select>
                </div>

                {/* Language */}
                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border">
                  <div className="text-xs font-semibold text-text-primary mb-1.5">Language</div>
                  <select
                    value={userPrefs.language}
                    onChange={(e) => handleUpdatePref(STORAGE_KEYS.LANGUAGE, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="zh">中文 (zh)</option>
                    <option value="ms">Bahasa Melayu (ms)</option>
                  </select>
                </div>

                {/* Hide Bus */}
                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border">
                  <div className="text-xs font-semibold text-text-primary mb-1.5">Hide Bus Button</div>
                  <select
                    value={userPrefs.hideBus}
                    onChange={(e) => handleUpdatePref(STORAGE_KEYS.BUS_BUTTON, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">True (Hidden)</option>
                    <option value="false">False (Visible)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Raw Key-Value Table */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    All LocalStorage Keys ({localStorageEntries.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddKeyModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Key</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs text-text-primary">
                  <thead className="bg-button-secondary/60 text-text-secondary uppercase font-mono text-[10px] border-b border-border">
                    <tr>
                      <th className="p-2.5">Key</th>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {localStorageEntries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-text-secondary">
                          LocalStorage is empty.
                        </td>
                      </tr>
                    ) : (
                      localStorageEntries.map((entry) => (
                        <tr key={entry.key} className="hover:bg-button-secondary/30 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-blue-500 whitespace-nowrap">
                            {entry.key}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                            {formatBytes(entry.size)}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-text-primary max-w-xs truncate">
                            {entry.value}
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(entry.value);
                                setCopiedKey(entry.key);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-text-primary transition-colors"
                              title="Copy"
                            >
                              {copiedKey === entry.key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingKey({ key: entry.key, value: entry.value })}
                              className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-blue-500 transition-colors"
                              title="Edit"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStorageKey(entry.key)}
                              className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-rose-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* ── SECTION 3: CACHE STORAGE ── */}
        {activeSection === "caches" && (
          <div className="space-y-5 mt-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Cache Storage ({cachedItems.length} files)
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Offline files stored via Service Worker Cache API.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={refreshCaches}
                    disabled={isLoadingCaches}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCaches ? "animate-spin" : ""}`} />
                    <span>Scan</span>
                  </button>

                  <button
                    onClick={handleClearCachedDirectories}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all"
                    title="Clear cached station directory maps"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Clear Directory Maps</span>
                  </button>

                  {cacheNames.map((cName) => (
                    <button
                      key={cName}
                      onClick={() => handlePurgeCache(cName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Cache</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cached Items Table */}
              <div className="overflow-x-auto rounded-xl border border-border mt-3">
                <table className="w-full text-left text-xs text-text-primary">
                  <thead className="bg-button-secondary/60 text-text-secondary uppercase font-mono text-[10px] border-b border-border">
                    <tr>
                      <th className="p-2.5">Resource URL</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {cachedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-text-secondary">
                          {isLoadingCaches ? "Scanning cache..." : "No items found in cache."}
                        </td>
                      </tr>
                    ) : (
                      cachedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-button-secondary/30 transition-colors">
                          <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 max-w-sm truncate font-semibold">
                            {item.url}
                          </td>
                          <td className="p-2.5 text-[11px] text-text-secondary whitespace-nowrap">
                            {item.contentType || "N/A"}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-text-primary whitespace-nowrap">
                            {item.sizeBytes !== undefined ? formatBytes(item.sizeBytes) : "Unknown"}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                              HTTP {item.status || 200}
                            </span>
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteCacheItem(item.cacheName, item.url)}
                              className="p-1 rounded-lg hover:bg-button-secondary text-text-secondary hover:text-rose-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* ── SECTION 4: OFFLINE TEST ── */}
        {activeSection === "offline_audit" && (
          <div className="space-y-5 mt-5">
            {/* Card 1: Offline Readiness Check */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-text-primary">Offline Readiness Check</h3>
                    {auditScore !== null && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {auditScore}% Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Verifies that transit datasets and schedules are cached for offline use.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={runOfflineAudit}
                  disabled={isAuditing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                  <span>Run Check</span>
                </button>

                <button
                  onClick={handlePrecacheAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Precache All</span>
                </button>
              </div>
            </div>

            {/* Card 2: Offline Simulation Switch */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  {isSimulatedOffline ? <WifiOff className="w-5 h-5 text-blue-500" /> : <Wifi className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-primary">Simulate Offline Mode</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Disconnects network to test offline route planning and caching.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSimulatedOffline}
                  onClick={toggleSimulatedOffline}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSimulatedOffline ? "bg-blue-600" : "bg-border"
                  }`}
                  title={isSimulatedOffline ? "Disable offline simulation" : "Enable offline simulation"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isSimulatedOffline ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card 3: Station Directory Caching Debug Switch */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-primary">Cache Station Directory Maps (~6 MB)</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Enable downloading 64 station floor plans for offline view. Turn off for lighter testing.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={cacheDirectories}
                  onClick={handleToggleCacheDirectories}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    cacheDirectories ? "bg-blue-600" : "bg-border"
                  }`}
                  title={cacheDirectories ? "Disable directory caching" : "Enable directory caching"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      cacheDirectories ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* How to use Offline Mode Instructions */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                How to Test Offline Mode
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border/60 space-y-1">
                  <div className="font-bold text-text-primary flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Precache Data
                  </div>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Click <strong>Precache All</strong> above to store map tracks, coordinates, and transit timetables into offline storage.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border/60 space-y-1">
                  <div className="font-bold text-text-primary flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Enable Simulation
                  </div>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Click <strong>Enable</strong> on the simulator card above (or turn on Airplane mode on your device).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-button-secondary/50 border border-border/60 space-y-1">
                  <div className="font-bold text-text-primary flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Use Map & Planner
                  </div>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Return to the <strong>Map</strong> or <strong>Plan</strong> tab. Stations, schedules, and route calculations work 100% offline!
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Checklist Table */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                Essential Files Checklist
              </h4>

              <div className="space-y-2">
                {auditResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-button-secondary/40 border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.cached ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-text-primary">{item.name}</div>
                        <div className="text-[10px] font-mono text-text-secondary">{item.url}</div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2.5">
                      <div className="text-[11px] text-text-secondary font-mono">
                        {item.size ? formatBytes(item.size) : "Not cached"}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.cached
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {item.cached ? "Cached" : "Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 5: BACKUP & RESET ── */}
        {activeSection === "backup" && (
          <div className="space-y-5 mt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Download className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Export Backup (.JSON)</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    Download all your favorites, saved routes, and preferences.
                  </p>
                </div>
                <button
                  onClick={handleExportState}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup</span>
                </button>
              </div>

              {/* Import */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Upload className="w-4 h-4 text-purple-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Import Backup (.JSON)</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    Restore previously saved favorites and preferences from JSON.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportState}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Clear Storage */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Clear All Storage</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Clears all LocalStorage, cached files, and resets the app state completely.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNuclearModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shrink-0 shadow-sm"
                >
                  Clear Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: STATION SELECTOR ── */}
      {showStationPickerModal && (
        <div
          onClick={() => setShowStationPickerModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl max-w-xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh] text-text-primary"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Select Station to Bookmark</h3>
                  <p className="text-[11px] text-text-secondary">Click any station to add to your favorite stations.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStationPickerModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-none hover:bg-button-secondary text-text-secondary hover:text-text-primary transition-colors text-xs"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Search Input & Line Filters */}
            <div className="pt-3 pb-2 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search by station name or code (e.g. KLCC, Pasar Seni, KG16)..."
                  value={stationSearchQuery}
                  onChange={(e) => setStationSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-input border border-border rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-blue-500"
                  autoFocus
                />
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
                  All Lines ({allAvailableStations.length})
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
            </div>

            {/* Station List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60 my-2 pr-1 rounded-xl border border-border bg-button-secondary/20">
              {filteredStationsForPicker.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  No stations found matching &quot;{stationSearchQuery}&quot;.
                </div>
              ) : (
                filteredStationsForPicker.map((st) => {
                  const isFav = favouriteStations.includes(st.name);
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
                          {st.codes.map((code) => {
                            const color = getStationCodeColor(code);
                            return (
                              <span
                                key={code}
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border"
                                style={{
                                  backgroundColor: `${color}18`,
                                  color: color,
                                  borderColor: `${color}35`,
                                }}
                              >
                                {code}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isFav) {
                            handleRemoveFavouriteStation(st.name);
                          } else {
                            handleAddFavouriteStation(st.name);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ml-2 ${
                          isFav
                            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 active:scale-95"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95"
                        }`}
                        title={isFav ? "Click to remove" : "Click to add"}
                      >
                        {isFav ? "Remove ✕" : "+ Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CUSTOM KEY ── */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-500" />
                Add LocalStorage Key
              </h3>
              <button onClick={() => setShowAddKeyModal(false)} className="text-text-secondary hover:text-text-primary text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Key Name</label>
                <input
                  type="text"
                  placeholder="e.g. custom_key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Value</label>
                <textarea
                  rows={4}
                  placeholder='e.g. "value" or {"foo": "bar"}'
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-input border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomKey}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT KEY ── */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-blue-500" />
                Edit: <span className="font-mono text-blue-500 lowercase">{editingKey.key}</span>
              </h3>
              <button onClick={() => setEditingKey(null)} className="text-text-secondary hover:text-text-primary text-xs">
                ✕
              </button>
            </div>

            <div>
              <textarea
                rows={8}
                value={editingKey.value}
                onChange={(e) => setEditingKey({ ...editingKey, value: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setEditingKey(null)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateExistingKey}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CLEAR CONFIRMATION ── */}
      {showNuclearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-card border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-text-primary">Clear All Storage?</h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This will remove all saved favorites, routes, preferences, and cached offline files from this device.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowNuclearModal(false)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleNuclearPurge}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
