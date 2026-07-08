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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-wide">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Theme Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              App Theme
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-1 border border-white/10">
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
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fare Display Preference
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-white/5 p-1 border border-white/10">
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
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
              <Key className="h-4 w-4 text-slate-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Google Maps API Key
              </label>
            </div>
            <input
              type="password"
              value={gmapsApiKey}
              onChange={(e) => setGmapsApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-[10px] text-slate-500 leading-normal">
              Used for fallback geocoding services. Leave blank for default keyless configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
