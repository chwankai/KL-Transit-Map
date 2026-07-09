import React, { createContext, useContext, useState, useEffect } from "react";
import { type Language, translations, translateStation, translateLine } from "../lib/translations";

export type Theme = "light" | "dark" | "system";
export type FarePreference = "all" | "cashless" | "cash" | "concession";

interface SettingsContextType {
  theme: Theme;
  farePref: FarePreference;
  hideBusButton: boolean;
  language: Language;
  setTheme: (theme: Theme) => void;
  setFarePref: (pref: FarePreference) => void;
  setHideBusButton: (hide: boolean) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tStation: (name: string) => string;
  tLine: (lineName: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme_preference") as Theme) || "system";
  });
  const [farePref, setFarePrefState] = useState<FarePreference>(() => {
    return (localStorage.getItem("fare_display_preference") as FarePreference) || "all";
  });
  const [hideBusButton, setHideBusButtonState] = useState<boolean>(() => {
    const saved = localStorage.getItem("hide_bus_button");
    return saved === null ? true : saved === "true";
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("language_preference") as Language) || "en";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme_preference", newTheme);
  };

  const setFarePref = (pref: FarePreference) => {
    setFarePrefState(pref);
    localStorage.setItem("fare_display_preference", pref);
  };

  const setHideBusButton = (hide: boolean) => {
    setHideBusButtonState(hide);
    localStorage.setItem("hide_bus_button", hide ? "true" : "false");
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language_preference", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const tStation = (name: string): string => {
    return translateStation(name, language);
  };

  const tLine = (lineName: string): string => {
    return translateLine(lineName, language);
  };

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    root.classList.remove("dark");
    body.classList.remove("light-theme");

    const applySystemTheme = () => {
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemIsDark) {
        root.classList.add("dark");
      } else {
        body.classList.add("light-theme");
      }
    };

    if (theme === "light") {
      body.classList.add("light-theme");
    } else if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "system") {
      applySystemTheme();
    }

    // Listen to media changes if system theme is selected
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        root.classList.remove("dark");
        body.classList.remove("light-theme");
        applySystemTheme();
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        farePref,
        hideBusButton,
        language,
        setTheme,
        setFarePref,
        setHideBusButton,
        setLanguage,
        t,
        tStation,
        tLine,
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
