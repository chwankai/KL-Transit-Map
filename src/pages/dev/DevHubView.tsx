import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DevNavBar } from "./DevNavBar";
import {
  Database, Globe, HardDrive, Wifi, WifiOff,
  Layers, ArrowRight, ShieldCheck,
  Compass, Map, Terminal, BarChart3
} from "lucide-react";
import { isSimulatedOffline } from "../../lib/offlineSimulator";
import { getMockLocation, type MockLocationData } from "../../lib/locationSimulator";

export const DevHubView: React.FC = () => {
  const [quotaText, setQuotaText] = useState<string>("Checking...");
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [localKeyCount, setLocalKeyCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine || isSimulatedOffline());
  const [mockLocation, setMockLocation] = useState<MockLocationData>(() => getMockLocation());

  useEffect(() => {
    // 1. Quota
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usage = est.usage || 0;
        const kb = (usage / 1024).toFixed(1);
        const mb = (usage / (1024 * 1024)).toFixed(2);
        setQuotaText(usage > 1024 * 1024 ? `${mb} MB` : `${kb} KB`);
      }).catch(() => setQuotaText("N/A"));
    }

    // 2. Cache count
    if ("caches" in window) {
      caches.keys().then(async (keys) => {
        let total = 0;
        for (const k of keys) {
          const c = await caches.open(k);
          const reqs = await c.keys();
          total += reqs.length;
        }
        setCacheCount(total);
      }).catch(() => {});
    }

    // 3. LocalStorage
    setLocalKeyCount(localStorage.length);

    // 4. Online/offline listener
    const handleStatus = () => {
      setIsOffline(!navigator.onLine || isSimulatedOffline());
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    window.addEventListener("simulated_offline_change", handleStatus);

    // 5. Mock GPS listener
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<MockLocationData>;
      if (customEvent.detail) {
        setMockLocation(customEvent.detail);
      } else {
        setMockLocation(getMockLocation());
      }
    };
    window.addEventListener("mock_location_changed", handleLocationChange);

    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
      window.removeEventListener("simulated_offline_change", handleStatus);
      window.removeEventListener("mock_location_changed", handleLocationChange);
    };
  }, []);

  const devTools = [
    {
      title: "RapidKL Ridership Insights",
      path: "/dev/insights",
      icon: BarChart3,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      description:
        "Real-time analytics, ridership volume, and daily passenger trends across LRT, MRT, Monorail, and Rapid Bus from data.gov.my Open API.",
      tags: ["Open Data API", "Daily Ridership", "Trend Charts", "API Tester"],
    },
    {
      title: "Stations & Lines Registry",
      path: "/dev/network",
      icon: Layers,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10",
      description:
        "Inspect, edit, and export 150+ transit stations, line color codes, operational metadata, and modify public/station_coords.json in real time.",
      tags: ["Station Coords", "Line Sequence", "Interchanges", "JSON Editor"],
    },
    {
      title: "Location & GPS Simulator",
      path: "/dev/location",
      icon: Compass,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      description:
        "Override browser geolocation with simulated GPS coordinates to test nearest station detection, map pinpointing, and route navigation.",
      tags: ["Mock GPS", "Landmark Snap", "Station Teleport", "Nearest Station"],
    },
    {
      title: "Storage & Cache Inspector",
      path: "/dev/storage",
      icon: Database,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      description:
        "Inspect LocalStorage, explore Cache Storage files, test offline simulation, seed realistic transit mock data, and manage client state.",
      tags: ["LocalStorage", "Cache API", "Offline Test", "Backup & Reset"],
    },
    {
      title: "Translations (i18n)",
      path: "/dev/translations",
      icon: Globe,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
      description:
        "Audit and edit multilingual UI strings and Chinese station names across all KL rail lines with live search and JSON export.",
      tags: ["UI Strings", "Station Names (ZH)", "Missing Translations", "JSON Export"],
    },
  ];

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Navigation Bar */}
      <DevNavBar activeTab="hub" />

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-6">
        {/* Hero / Header */}
        <div className="pb-6 border-b border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Terminal className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
              Developer Portal
            </h1>
            <span className="ml-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Dev Environment
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
            Internal utilities to monitor client storage, audit translations, seed mock data, and test offline functionality.
          </p>
        </div>

        {/* Live System Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Storage Usage</span>
              <HardDrive className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-base sm:text-lg font-extrabold text-text-primary">{quotaText}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Local Keys</span>
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-base sm:text-lg font-extrabold text-text-primary">{localKeyCount} Keys</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Cached Files</span>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-base sm:text-lg font-extrabold text-text-primary">{cacheCount} Files</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Network</span>
              {isOffline ? <WifiOff className="w-4 h-4 text-amber-500" /> : <Wifi className="w-4 h-4 text-emerald-500" />}
            </div>
            <div className="mt-2 text-base sm:text-lg font-extrabold text-text-primary">
              <span className={isOffline ? "text-amber-500" : "text-emerald-500"}>
                {isOffline ? "Offline Mode" : "Online"}
              </span>
            </div>
          </div>

          {/* Card 5: Mock GPS (Behind Network Card) */}
          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Mock GPS</span>
              <Compass className={`w-4 h-4 ${mockLocation.enabled ? "text-purple-500" : "text-text-secondary"}`} />
            </div>
            <div className="mt-2 text-base sm:text-lg font-extrabold text-text-primary flex items-center gap-1.5">
              <span className={mockLocation.enabled ? "text-purple-500" : "text-text-secondary"}>
                {mockLocation.enabled ? "Active" : "Default GPS"}
              </span>
            </div>
          </div>
        </div>

        {/* Developer Tool Cards */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Available Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${tool.iconBg} ${tool.iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-text-primary group-hover:text-blue-500 transition-colors">
                          {tool.title}
                        </h3>
                      </div>
                      <div className="p-1.5 rounded-lg bg-button-secondary text-text-secondary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-1.5">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-lg bg-button-secondary text-[10px] font-semibold text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
            Quick App Navigation
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border font-semibold transition-all"
            >
              <Map className="w-3.5 h-3.5 text-blue-500" />
              <span>Interactive Map</span>
            </Link>

            <Link
              to="/plan"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border font-semibold transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              <span>Route Planner</span>
            </Link>

            <Link
              to="/lines"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-button-secondary hover:bg-button-secondary/80 text-text-primary border border-border font-semibold transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Line Overview</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
