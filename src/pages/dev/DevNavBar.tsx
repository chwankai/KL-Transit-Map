import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Database, Globe, ArrowLeft, Terminal, Compass, Layers, BarChart3 } from "lucide-react";

interface DevNavBarProps {
  activeTab?: "hub" | "storage" | "translations" | "location" | "network" | "insights";
}

export const DevNavBar: React.FC<DevNavBarProps> = ({ activeTab }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isHub = activeTab ? activeTab === "hub" : currentPath === "/dev" || currentPath === "/dev/";
  const isInsights = activeTab ? activeTab === "insights" : currentPath.includes("/dev/insights") || currentPath.includes("/dev/ridership");
  const isNetwork = activeTab ? activeTab === "network" : currentPath.includes("/dev/network") || currentPath.includes("/dev/stations") || currentPath.includes("/dev/lines");
  const isStorage = activeTab ? activeTab === "storage" : currentPath.includes("/dev/storage") || currentPath.includes("/dev/inspector");
  const isLocation = activeTab ? activeTab === "location" : currentPath.includes("/dev/location") || currentPath.includes("/dev/gps");
  const isTranslations = activeTab ? activeTab === "translations" : currentPath.includes("/dev/translations") || currentPath.includes("/dev/i18n");

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/90 backdrop-blur-md transition-colors">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: App Back Link & Simple Dev Title */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-button-secondary hover:bg-button-secondary/80 border border-border transition-all active:scale-95 group"
            title="Return to Map"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Map</span>
          </Link>

          <div className="h-4 w-[1px] bg-border mx-0.5" />

          <Link
            to="/dev"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Dev Hub"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
              Dev Tools
            </span>
          </Link>
        </div>

        {/* Center / Right: Clean Nav Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/dev"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isHub
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>

          <Link
            to="/dev/insights"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isInsights
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights</span>
          </Link>

          <Link
            to="/dev/network"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isNetwork
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stations & Lines</span>
          </Link>

          <Link
            to="/dev/location"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isLocation
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>GPS Sim</span>
          </Link>

          <Link
            to="/dev/storage"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isStorage
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Storage & Cache</span>
          </Link>

          <Link
            to="/dev/translations"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isTranslations
                ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Translations</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
