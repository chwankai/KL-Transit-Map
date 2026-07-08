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
      {/* Top Header - Desktop & Tablet */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 h-[64px] border-b border-border/80 bg-slate-900/80 backdrop-blur-md z-40 dark:bg-slate-950/80">
        <Link to="/" className="flex items-center gap-3 select-none">
          <div className="text-2xl">🚇</div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              KL Transit Map
            </h1>
            <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wider text-text-secondary select-none">
              Integrated Route Planner
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all active:scale-95"
          title="Open Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* Main Page Content Wrapper */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Nav Bar - Mobile Only */}
      <nav className="md:hidden flex-shrink-0 flex items-center justify-around h-[64px] border-t border-border/80 bg-slate-900/85 backdrop-blur-md z-40 pb-safe dark:bg-slate-950/85">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${
                isActive ? "text-blue-500" : "text-text-secondary"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold tracking-wide uppercase select-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center justify-center w-20 h-full gap-1 text-text-secondary"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-wide uppercase select-none">Settings</span>
        </button>
      </nav>

      {/* Settings Modal */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
