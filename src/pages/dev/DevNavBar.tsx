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

  const navItems = [
    { label: "Overview", to: "/dev", icon: Terminal, active: isHub },
    { label: "Insights", to: "/dev/insights", icon: BarChart3, active: isInsights },
    { label: "Stations & Lines", to: "/dev/network", icon: Layers, active: isNetwork },
    { label: "GPS Sim", to: "/dev/location", icon: Compass, active: isLocation },
    { label: "Storage & Cache", to: "/dev/storage", icon: Database, active: isStorage },
    { label: "Translations", to: "/dev/translations", icon: Globe, active: isTranslations },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur-md transition-colors shadow-sm">
      <div className="w-full px-3 sm:px-6">
        {/* Top Header Row */}
        <div className="h-13 sm:h-14 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: App Back Link & Dev Title */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-button-secondary hover:bg-button-secondary/80 border border-border transition-all active:scale-95 group shrink-0"
              title="Return to Map"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden xs:inline">Map</span>
            </Link>

            <div className="h-4 w-[1px] bg-border mx-0.5" />

            <Link
              to="/dev"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
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

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    item.active
                      ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Horizontal Scrollable Tab Bar (Visible on mobile screens) */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-border/50 no-scrollbar select-none -mx-1 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-button-secondary/60 text-text-secondary hover:text-text-primary border border-border/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
