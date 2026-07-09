import React from "react";
import { useSettings } from "../../context/SettingsContext";
import { X, Sun, Moon, Laptop, Key } from "lucide-react";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, farePref, setFarePref, gmapsApiKey, setGmapsApiKey } = useSettings();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-text-primary shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-wide text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Theme Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              App Theme
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-button-secondary p-1 border border-border">
              {(
                [
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Laptop },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    theme === id
                      ? "bg-blue-600 text-white shadow-md font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fare Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Fare Display Preference
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-button-secondary p-1 border border-border">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "cashless", label: "Cashless" },
                  { id: "cash", label: "Cash" },
                  { id: "concession", label: "Concession" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFarePref(id)}
                  className={`py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                    farePref === id
                      ? "bg-blue-600 text-white shadow-md font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-button-secondary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Google Maps API Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-text-secondary" />
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Google Maps API Key
              </label>
            </div>
            <input
              type="password"
              value={gmapsApiKey}
              onChange={(e) => setGmapsApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-input text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-[10px] text-text-secondary leading-normal">
              Used for fallback geocoding services. Leave blank for default keyless configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
