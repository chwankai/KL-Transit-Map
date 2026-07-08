import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";
export type FarePreference = "all" | "cashless" | "cash" | "concession";

interface SettingsContextType {
  theme: Theme;
  farePref: FarePreference;
  gmapsApiKey: string;
  setTheme: (theme: Theme) => void;
  setFarePref: (pref: FarePreference) => void;
  setGmapsApiKey: (key: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme_preference") as Theme) || "system";
  });
  const [farePref, setFarePrefState] = useState<FarePreference>(() => {
    return (localStorage.getItem("fare_display_preference") as FarePreference) || "all";
  });
  const [gmapsApiKey, setGmapsApiKeyState] = useState<string>(() => {
    return localStorage.getItem("gmaps_api_key") || "";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme_preference", newTheme);
  };

  const setFarePref = (pref: FarePreference) => {
    setFarePrefState(pref);
    localStorage.setItem("fare_display_preference", pref);
  };

  const setGmapsApiKey = (key: string) => {
    setGmapsApiKeyState(key);
    localStorage.setItem("gmaps_api_key", key);
  };

  // Apply theme class to document body
  useEffect(() => {
    const root = window.document.body;
    root.classList.remove("light-theme");

    const applySystemTheme = () => {
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (!systemIsDark) {
        root.classList.add("light-theme");
      }
    };

    if (theme === "light") {
      root.classList.add("light-theme");
    } else if (theme === "system") {
      applySystemTheme();
    }

    // Listen to media changes if system theme is selected
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applySystemTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        farePref,
        gmapsApiKey,
        setTheme,
        setFarePref,
        setGmapsApiKey,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
