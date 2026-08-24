import React, { useState, useMemo } from "react";
import {
  translations as initialTranslations,
  stationNamesZh as initialStationNamesZh,
} from "../lib/translations";
import {
  Search, Save, Download, Copy, Check, Plus, Trash2, RotateCcw,
  Code, Globe, Layers, AlertCircle, CheckCircle2, FileText
} from "lucide-react";

type LanguageKey = "en" | "zh" | "ms";

interface KeyRecord {
  key: string;
  en: string;
  zh: string;
  ms: string;
}

export const DevTranslationsView: React.FC = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<"ui_keys" | "station_names" | "code_preview">("ui_keys");

  // Editable UI translations state
  const [translationsData, setTranslationsData] = useState<{
    en: Record<string, string>;
    zh: Record<string, string>;
    ms: Record<string, string>;
  }>(() => ({
    en: { ...initialTranslations.en },
    zh: { ...initialTranslations.zh },
    ms: { ...initialTranslations.ms },
  }));

  // Editable station names dictionary
  const [stationNamesData, setStationNamesData] = useState<Record<string, string>>(() => ({
    ...initialStationNamesZh,
  }));

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "missing" | "modified">("all");

  // Save / Copy status feedback
  const [saveStatus, setSaveStatus] = useState<{ type: "idle" | "saving" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [copiedCode, setCopiedCode] = useState(false);

  // New Key Modal state
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEn, setNewKeyEn] = useState("");
  const [newKeyZh, setNewKeyZh] = useState("");
  const [newKeyMs, setNewKeyMs] = useState("");

  // New Station Modal state
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [newStationEn, setNewStationEn] = useState("");
  const [newStationZh, setNewStationZh] = useState("");

  // Convert keys into array of KeyRecord
  const allKeys = useMemo<string[]>(() => {
    const keysSet = new Set<string>([
      ...Object.keys(translationsData.en),
      ...Object.keys(translationsData.zh),
      ...Object.keys(translationsData.ms),
    ]);
    return Array.from(keysSet).sort();
  }, [translationsData]);

  const records = useMemo<KeyRecord[]>(() => {
    return allKeys.map((k) => ({
      key: k,
      en: translationsData.en[k] ?? "",
      zh: translationsData.zh[k] ?? "",
      ms: translationsData.ms[k] ?? "",
    }));
  }, [allKeys, translationsData]);

  // Check if a record is modified compared to initial
  const isKeyModified = (k: string) => {
    const origEn = (initialTranslations.en as Record<string, string>)[k] ?? "";
    const origZh = (initialTranslations.zh as Record<string, string>)[k] ?? "";
    const origMs = (initialTranslations.ms as Record<string, string>)[k] ?? "";
    return (
      translationsData.en[k] !== origEn ||
      translationsData.zh[k] !== origZh ||
      translationsData.ms[k] !== origMs
    );
  };

  // Modified count
  const modifiedKeysCount = useMemo(() => {
    return allKeys.filter((k) => isKeyModified(k)).length;
  }, [allKeys, translationsData]);

  // Missing count
  const missingKeysCount = useMemo(() => {
    return records.filter((r) => !r.zh.trim() || !r.ms.trim()).length;
  }, [records]);

  // Filtered UI Records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      // Filter mode
      if (filterMode === "missing") {
        if (r.zh.trim() && r.ms.trim()) return false;
      }
      if (filterMode === "modified") {
        if (!isKeyModified(r.key)) return false;
      }

      // Search query
      if (!q) return true;
      return (
        r.key.toLowerCase().includes(q) ||
        r.en.toLowerCase().includes(q) ||
        r.zh.toLowerCase().includes(q) ||
        r.ms.toLowerCase().includes(q)
      );
    });
  }, [records, filterMode, searchQuery]);

  // Filtered Station Records
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const entries = Object.entries(stationNamesData).sort((a, b) => a[0].localeCompare(b[0]));
    if (!q) return entries;
    return entries.filter(([en, zh]) => en.toLowerCase().includes(q) || zh.toLowerCase().includes(q));
  }, [stationNamesData, searchQuery]);

  // Update a single key translation
  const handleUpdateTranslation = (lang: LanguageKey, key: string, value: string) => {
    setTranslationsData((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value,
      },
    }));
  };

  // Delete a key
  const handleDeleteKey = (key: string) => {
    if (!window.confirm(`Are you sure you want to delete key: "${key}"?`)) return;
    setTranslationsData((prev) => {
      const nextEn = { ...prev.en };
      const nextZh = { ...prev.zh };
      const nextMs = { ...prev.ms };
      delete nextEn[key];
      delete nextZh[key];
      delete nextMs[key];
      return { en: nextEn, zh: nextZh, ms: nextMs };
    });
  };

  // Add a new key
  const handleAddNewKey = () => {
    const k = newKeyName.trim();
    if (!k) return;
    setTranslationsData((prev) => ({
      en: { ...prev.en, [k]: newKeyEn },
      zh: { ...prev.zh, [k]: newKeyZh },
      ms: { ...prev.ms, [k]: newKeyMs },
    }));
    setNewKeyName("");
    setNewKeyEn("");
    setNewKeyZh("");
    setNewKeyMs("");
    setShowAddKeyModal(false);
  };

  // Update a station translation
  const handleUpdateStation = (en: string, zh: string) => {
    setStationNamesData((prev) => ({
      ...prev,
      [en]: zh,
    }));
  };

  // Delete a station translation
  const handleDeleteStation = (en: string) => {
    if (!window.confirm(`Delete station translation for "${en}"?`)) return;
    setStationNamesData((prev) => {
      const next = { ...prev };
      delete next[en];
      return next;
    });
  };

  // Add a new station
  const handleAddNewStation = () => {
    const en = newStationEn.trim();
    const zh = newStationZh.trim();
    if (!en || !zh) return;
    setStationNamesData((prev) => ({
      ...prev,
      [en]: zh,
    }));
    setNewStationEn("");
    setNewStationZh("");
    setShowAddStationModal(false);
  };

  // Generate clean TypeScript code for src/lib/translations.ts
  const generateTranslationsCode = (): string => {
    const serializeObj = (obj: Record<string, string>, indent = 4) => {
      const sp = " ".repeat(indent);
      return Object.entries(obj)
        .map(([k, v]) => `${sp}${JSON.stringify(k)}: ${JSON.stringify(v)},`)
        .join("\n");
    };

    return `export type Language = "en" | "zh" | "ms";

export const translations: Record<Language, Record<string, string>> = {
  en: {
${serializeObj(translationsData.en, 4)}
  },
  zh: {
${serializeObj(translationsData.zh, 4)}
  },
  ms: {
${serializeObj(translationsData.ms, 4)}
  }
};

// Major station names translation dictionary
export const stationNamesZh: Record<string, string> = {
${serializeObj(stationNamesData, 2)}
};

export const translateStation = (name: string, lang: Language): string => {
  let displayName = name;
  if (name === "Tun Razak Exchange") {
    displayName = "Tun Razak Exchange (TRX)";
  } else if (name === "Pasar Jawa") {
    displayName = "Jambatan Kota";
  }
  if (lang === "en" || lang === "ms") return displayName;
  return stationNamesZh[name] || stationNamesZh[displayName] || displayName;
};

export const translateLine = (lineName: string, lang: Language): string => {
  if (lang === "ms") {
    if (lineName === "LRT Kelana Jaya Line") return "Laluan LRT Kelana Jaya";
    if (lineName === "LRT Ampang Line") return "Laluan LRT Ampang";
    if (lineName === "LRT Sri Petaling Line") return "Laluan LRT Sri Petaling";
    if (lineName === "MRT Kajang Line") return "Laluan MRT Kajang";
    if (lineName === "MRT Putrajaya Line") return "Laluan MRT Putrajaya";
    if (lineName === "KL Monorail Line") return "Laluan Monorel KL";
    if (lineName === "BRT Sunway Line") return "Laluan BRT Sunway";
    if (lineName === "LRT Shah Alam Line") return "Laluan LRT Shah Alam";
  }
  if (lang === "en") return lineName;
  if (lineName === "LRT Kelana Jaya Line") return "格拉那再也轻快铁线";
  if (lineName === "LRT Ampang Line") return "安邦轻快铁线";
  if (lineName === "LRT Sri Petaling Line") return "大城堡轻快铁线";
  if (lineName === "MRT Kajang Line") return "加影捷运线";
  if (lineName === "MRT Putrajaya Line") return "布城捷运线";
  if (lineName === "KL Monorail Line") return "吉隆坡单轨线";
  if (lineName === "BRT Sunway Line") return "双威快捷巴士线";
  if (lineName === "LRT Shah Alam Line") return "莎阿南轻快铁线";
  return lineName;
};
`;
  };

  // Save directly to disk via dev server middleware
  const handleSaveToCodebase = async () => {
    setSaveStatus({ type: "saving" });
    const code = generateTranslationsCode();

    try {
      const res = await fetch("/__dev/save-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveStatus({
          type: "success",
          message: data.message || "Successfully saved to src/lib/translations.ts!",
        });
        setTimeout(() => setSaveStatus({ type: "idle" }), 4000);
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (e: any) {
      console.warn("Dev save endpoint unavailable, falling back to download:", e);
      setSaveStatus({
        type: "error",
        message: "Dev API unavailable in production build. Please use the Download or Copy button.",
      });
      setTimeout(() => setSaveStatus({ type: "idle" }), 6000);
    }
  };

  // Download translations.ts file
  const handleDownloadFile = () => {
    const code = generateTranslationsCode();
    const blob = new Blob([code], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "translations.ts";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    const code = generateTranslationsCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Reset to original file values
  const handleResetToDefault = () => {
    if (!window.confirm("Reset all translation fields back to the current file defaults?")) return;
    setTranslationsData({
      en: { ...initialTranslations.en },
      zh: { ...initialTranslations.zh },
      ms: { ...initialTranslations.ms },
    });
    setStationNamesData({ ...initialStationNamesZh });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-text-primary overflow-hidden select-text">
      {/* ── Top Header Toolbar ── */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md flex-shrink-0 divide-y divide-border/60">
        {/* Row 1: Title & Actions */}
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/15 text-purple-500 font-mono text-xs font-black shadow-inner">
              DEV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-text-primary">
                  Translation & i18n Management Portal
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] font-mono font-bold">
                  developer-only
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Inspect key relationships across different languages and save directly to <code className="text-blue-500 font-mono">src/lib/translations.ts</code>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:bg-button-secondary hover:border-blue-500 transition-all active:scale-95 shadow-sm"
              title="Reset all fields"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:border-blue-500 transition-all active:scale-95 shadow-sm"
              title="Copy TypeScript Code"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:border-blue-500 transition-all active:scale-95 shadow-sm"
              title="Download translations.ts"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .ts</span>
            </button>

            <button
              onClick={handleSaveToCodebase}
              disabled={saveStatus.type === "saving"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus.type === "saving" ? "Saving..." : "Save to translations.ts"}</span>
            </button>
          </div>
        </div>

        {/* Save Status Banner (if active) */}
        {saveStatus.type === "success" && (
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}
        {saveStatus.type === "error" && (
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}

        {/* Row 2: Stats and Navigation Tabs */}
        <div className="px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/40">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ui_keys")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "ui_keys"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-card border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>App UI Keys ({allKeys.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("station_names")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "station_names"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-card border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Chinese Station Names ({Object.keys(stationNamesData).length})</span>
            </button>

            <button
              onClick={() => setActiveTab("code_preview")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "code_preview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-card border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Code Preview</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-[11px] text-text-secondary font-medium">
            {modifiedKeysCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                {modifiedKeysCount} unsaved changes
              </span>
            )}
            {missingKeysCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                {missingKeysCount} missing translations
              </span>
            )}
            <span>Total Keys: <strong className="text-text-primary">{allKeys.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── TAB 1: UI Translations Key Matrix ── */}
        {activeTab === "ui_keys" && (
          <div className="space-y-3">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keys, English, Chinese, or Malay text..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border dark:border-slate-800 bg-input dark:bg-slate-900 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl p-1">
                  {(["all", "missing", "modified"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMode(m)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                        filterMode === m
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddKeyModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Key</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-800 bg-button-secondary/60 dark:bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">
                      <th className="p-3 w-[220px]">Key Name</th>
                      <th className="p-3">English (en)</th>
                      <th className="p-3">Chinese (zh)</th>
                      <th className="p-3">Malay (ms)</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-text-secondary dark:text-slate-400">
                          No translation keys match the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const isModified = isKeyModified(r.key);
                        const isMissing = !r.zh.trim() || !r.ms.trim();

                        return (
                          <tr
                            key={r.key}
                            className={`hover:bg-button-secondary/30 dark:hover:bg-slate-800/40 transition-colors ${
                              isModified ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                            }`}
                          >
                            {/* Key Column */}
                            <td className="p-3 align-top">
                              <div className="flex items-start gap-1.5">
                                {isModified && (
                                  <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" title="Modified" />
                                )}
                                {isMissing && (
                                  <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" title="Missing translation" />
                                )}
                                <div className="space-y-0.5 min-w-0">
                                  <span className="font-mono font-bold text-blue-500 dark:text-blue-400 text-[11.5px] break-all">
                                    {r.key}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* English Column */}
                            <td className="p-2.5 align-top">
                              <textarea
                                value={r.en}
                                onChange={(e) => handleUpdateTranslation("en", r.key, e.target.value)}
                                rows={Math.max(1, Math.ceil((r.en.length || 1) / 35))}
                                className="w-full p-2.5 rounded-xl border border-border dark:border-slate-800 bg-input/80 dark:bg-slate-900/90 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:bg-input dark:focus:bg-slate-900 transition-all resize-y min-h-[36px]"
                              />
                            </td>

                            {/* Chinese Column */}
                            <td className="p-2.5 align-top">
                              <textarea
                                value={r.zh}
                                onChange={(e) => handleUpdateTranslation("zh", r.key, e.target.value)}
                                rows={Math.max(1, Math.ceil((r.zh.length || 1) / 35))}
                                placeholder="未翻译 (Missing)"
                                className={`w-full p-2.5 rounded-xl border text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:bg-input dark:focus:bg-slate-900 transition-all resize-y min-h-[36px] ${
                                  !r.zh.trim()
                                    ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 dark:border-rose-500/30 placeholder:text-rose-400/60"
                                    : "border-border dark:border-slate-800 bg-input/80 dark:bg-slate-900/90"
                                }`}
                              />
                            </td>

                            {/* Malay Column */}
                            <td className="p-2.5 align-top">
                              <textarea
                                value={r.ms}
                                onChange={(e) => handleUpdateTranslation("ms", r.key, e.target.value)}
                                rows={Math.max(1, Math.ceil((r.ms.length || 1) / 35))}
                                placeholder="Tiada terjemahan (Missing)"
                                className={`w-full p-2.5 rounded-xl border text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:bg-input dark:focus:bg-slate-900 transition-all resize-y min-h-[36px] ${
                                  !r.ms.trim()
                                    ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 dark:border-rose-500/30 placeholder:text-rose-400/60"
                                    : "border-border dark:border-slate-800 bg-input/80 dark:bg-slate-900/90"
                                }`}
                              />
                            </td>

                            {/* Action Column */}
                            <td className="p-3 text-center align-middle">
                              <button
                                onClick={() => handleDeleteKey(r.key)}
                                className="p-1.5 rounded-lg text-text-secondary dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Delete Key"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Station Names Translations Matrix ── */}
        {activeTab === "station_names" && (
          <div className="space-y-3">
            {/* Search & Add Station Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search station English or Chinese names..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border dark:border-slate-800 bg-input dark:bg-slate-900 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowAddStationModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold whitespace-nowrap shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Station Translation</span>
              </button>
            </div>

            {/* Station Table */}
            <div className="rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900/60 overflow-hidden shadow-sm max-w-4xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-800 bg-button-secondary/60 dark:bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-1/2">Station Name (EN / System ID)</th>
                      <th className="p-3 w-1/2">Chinese Name (ZH)</th>
                      <th className="p-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                    {filteredStations.map(([en, zh], idx) => (
                      <tr key={en} className="hover:bg-button-secondary/30 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center text-text-secondary dark:text-slate-400 font-mono text-[10.5px]">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-semibold text-text-primary dark:text-slate-100">
                          {en}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={zh}
                            onChange={(e) => handleUpdateStation(en, e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-border dark:border-slate-800 bg-input dark:bg-slate-900 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteStation(en)}
                            className="p-1.5 rounded-lg text-text-secondary dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Translation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: Generated Code Preview ── */}
        {activeTab === "code_preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary dark:text-slate-400">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Target output: <code className="font-mono text-blue-500 dark:text-blue-400">src/lib/translations.ts</code></span>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-slate-200 hover:border-blue-500 transition-all shadow-sm"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? "Copied to Clipboard!" : "Copy Full Code"}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-950/90 font-mono text-xs text-text-primary dark:text-slate-200 overflow-x-auto leading-relaxed max-h-[70vh] select-all shadow-inner">
              {generateTranslationsCode()}
            </pre>
          </div>
        )}
      </div>

      {/* ── Add Key Modal ── */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 p-5 space-y-4 shadow-2xl text-text-primary dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Add New Translation Key</h3>
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">Key Name (camelCase)</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. viewLiveSchedule"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">English (en)</label>
                <input
                  type="text"
                  value={newKeyEn}
                  onChange={(e) => setNewKeyEn(e.target.value)}
                  placeholder="e.g. View Live Schedule"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">Chinese (zh)</label>
                <input
                  type="text"
                  value={newKeyZh}
                  onChange={(e) => setNewKeyZh(e.target.value)}
                  placeholder="e.g. 查看实时班次表"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">Malay (ms)</label>
                <input
                  type="text"
                  value={newKeyMs}
                  onChange={(e) => setNewKeyMs(e.target.value)}
                  placeholder="e.g. Lihat Jadual Langsung"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60 dark:border-slate-800">
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 text-xs font-semibold text-text-secondary dark:text-slate-300 hover:text-text-primary dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewKey}
                disabled={!newKeyName.trim()}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Station Modal ── */}
      {showAddStationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 p-5 space-y-4 shadow-2xl text-text-primary dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Add Station Chinese Name</h3>
              <button
                onClick={() => setShowAddStationModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">Station English / ID Name</label>
                <input
                  type="text"
                  value={newStationEn}
                  onChange={(e) => setNewStationEn(e.target.value)}
                  placeholder="e.g. Subang Jaya"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary dark:text-slate-400 block mb-1">Chinese Name (ZH)</label>
                <input
                  type="text"
                  value={newStationZh}
                  onChange={(e) => setNewStationZh(e.target.value)}
                  placeholder="e.g. 梳邦再也"
                  className="w-full p-2.5 rounded-xl border border-border dark:border-slate-700 bg-input dark:bg-slate-950 text-xs text-text-primary dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60 dark:border-slate-800">
              <button
                onClick={() => setShowAddStationModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 text-xs font-semibold text-text-secondary dark:text-slate-300 hover:text-text-primary dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewStation}
                disabled={!newStationEn.trim() || !newStationZh.trim()}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                Add Station
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
