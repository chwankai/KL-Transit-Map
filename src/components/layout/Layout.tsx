import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Map, Compass, Bus, Settings } from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Map", icon: Map },
    { path: "/plan", label: "Plan", icon: Compass },
    { path: "/bus", label: "Bus", icon: Bus },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* Top Header - Unified Mobile & Desktop */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-[calc(64px+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b border-border bg-card backdrop-blur-md z-40">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 select-none">
          <div className="text-xl sm:text-2xl flex items-center justify-center">🚇</div>
          <div className="flex flex-col md:gap-0.5">
            <h1 className="text-xs sm:text-base font-bold tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent leading-tight md:leading-snug">
              KL Transit Map
            </h1>
            <span className="hidden md:inline text-[9px] font-semibold uppercase tracking-wider text-text-secondary select-none leading-tight mt-0.5">
              Integrated Route Planner
            </span>
          </div>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-0.5 sm:gap-1.5">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-2 md:px-3.5 py-1 sm:py-2 rounded-lg text-[9px] md:text-sm font-bold tracking-wide transition-all ${
                    isActive
                      ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  <span className="leading-none mt-0.5 md:mt-0">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full p-2 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-all active:scale-95 flex items-center justify-center"
            title="Open Settings"
          >
            <Settings className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>
        </div>
      </header>

      {/* Main Page Content Wrapper */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Settings Modal */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
