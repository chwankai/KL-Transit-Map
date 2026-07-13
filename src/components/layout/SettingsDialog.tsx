import React from "react";
import { useSettings } from "../../context/SettingsContext";
import { X, Sun, Moon, Laptop, EyeOff, Globe, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../../lib/analytics";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    farePref,
    setFarePref,
    hideBusButton,
    setHideBusButton,
    language,
    setLanguage,
    t,
  } = useSettings();

  const handleLanguageChange = (id: "en" | "ms" | "zh") => {
    setLanguage(id);
    trackEvent("change_language", "settings", id);
  };

  const handleThemeChange = (id: "system" | "light" | "dark") => {
    setTheme(id);
    trackEvent("change_theme", "settings", id);
  };

  const handleFarePrefChange = (id: "all" | "cashless" | "cash" | "concession") => {
    setFarePref(id);
    trackEvent("change_fare_preference", "settings", id);
  };

  const handleHideBusChange = (checked: boolean) => {
    setHideBusButton(checked);
    trackEvent("toggle_hide_bus", "settings", checked ? "hidden" : "visible");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-text-primary shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-wide text-text-primary">
            {t("settings")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Language Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t("languageLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-button-secondary p-1 border border-border">
              {(
                [
                  { id: "en", label: "English" },
                  { id: "ms", label: "Melayu" },
                  { id: "zh", label: "中文" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleLanguageChange(id)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    language === id
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t("appTheme")}
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-button-secondary p-1 border border-border">
              {(
                [
                  { id: "system", labelKey: "system", icon: Laptop },
                  { id: "light", labelKey: "light", icon: Sun },
                  { id: "dark", labelKey: "dark", icon: Moon },
                ] as const
              ).map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                    theme === id
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Fare Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t("farePreference")}
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-button-secondary p-1 border border-border">
              {(
                [
                  { id: "all", labelKey: "all" },
                  { id: "cashless", labelKey: "cashless" },
                  { id: "cash", labelKey: "cash" },
                  { id: "concession", labelKey: "concession" },
                ] as const
              ).map(({ id, labelKey }) => (
                <button
                  key={id}
                  onClick={() => handleFarePrefChange(id)}
                  className={`py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                    farePref === id
                      ? "bg-blue-600 text-white shadow-md font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Settings Group */}
          <div className="border-t border-border pt-4 space-y-4">
            {/* Hide Bus Tracker Button Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-text-secondary" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-text-primary">
                    {t("hideBus")}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {t("hideBusDesc")}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hideBusButton}
                onChange={(e) => handleHideBusChange(e.target.checked)}
                className="rounded bg-input border-border text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
              />
            </div>

            {/* How-to Guide Link */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-text-secondary" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-text-primary">
                    {t("howToGuide")}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {t("howToGuideDesc")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  navigate("/guide");
                  onClose();
                  trackEvent("click_how_to_guide", "settings");
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm active:scale-95"
              >
                {t("open")}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
