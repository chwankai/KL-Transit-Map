import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Map, Compass, Bus, Settings, Train, X } from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";
import { useSettings } from "../../context/SettingsContext";
import { AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { hideBusButton, t } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineBanner(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const navItems = [
    { path: "/", labelKey: "map", icon: Map },
    { path: "/lines", labelKey: "line", icon: Train },
    { path: "/plan", labelKey: "plan", icon: Compass },
    ...(!hideBusButton ? [{ path: "/bus", labelKey: "bus", icon: Bus }] : []),
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-text-primary">
      {/* Top Header - Unified Mobile & Desktop */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-[calc(64px+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b border-border bg-card backdrop-blur-md z-40">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 select-none">
          <div className="text-xl sm:text-2xl flex items-center justify-center">🚇</div>
          <div className="flex flex-col md:gap-0.5">
            <h1 className="text-xs sm:text-base font-bold tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent leading-tight md:leading-snug">
              KL Transit Map
            </h1>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary select-none leading-tight mt-0.5">
              {t("integratedPlanner")}
            </span>
          </div>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-2 sm:gap-3">
            {navItems.map(({ path, labelKey, icon: Icon }) => {
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
                  <span className="leading-none mt-0.5 md:mt-0">{t(labelKey)}</span>
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
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* Offline Warning Banner */}
      {isOffline && showOfflineBanner && (
        <div className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-amber-600/95 backdrop-blur text-white rounded-xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-200 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm select-none">⚠️</span>
            <span className="text-[10px] sm:text-[11px] font-bold leading-normal">
              {t("offlineWarning") || "Not connected to the Internet, some features might be unavailable."}
            </span>
          </div>
          <button
            onClick={() => setShowOfflineBanner(false)}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors active:scale-90"
            title="Close warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
