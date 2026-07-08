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
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-[64px] border-b border-border/80 bg-slate-900/80 backdrop-blur-md z-40 dark:bg-slate-950/80">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 select-none">
          <div className="text-xl sm:text-2xl">🚇</div>
          <div>
            <h1 className="text-xs sm:text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              KL Transit Map
            </h1>
            <span className="hidden md:inline text-[9px] font-medium uppercase tracking-wider text-text-secondary select-none">
              Integrated Route Planner
            </span>
          </div>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden min-[450px]:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-[1px] bg-white/10 mx-1 sm:mx-1.5" />

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all active:scale-95"
            title="Open Settings"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
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
