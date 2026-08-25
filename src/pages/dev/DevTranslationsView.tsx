import React, { useState, useMemo } from "react";
import {
  translations as initialTranslations,
  stationNamesZh as initialStationNamesZh,
} from "../../lib/translations";
import { DevNavBar } from "./DevNavBar";
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
      if (filterMode === "missing") {
        if (r.zh.trim() && r.ms.trim()) return false;
      }
      if (filterMode === "modified") {
        if (!isKeyModified(r.key)) return false;
      }

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
    if (!window.confirm(`Delete key "${key}"?`)) return;
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
    if (!window.confirm(`Delete station "${en}"?`)) return;
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
          message: data.message || "Saved to src/lib/translations.ts!",
        });
        setTimeout(() => setSaveStatus({ type: "idle" }), 3500);
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (e: unknown) {
      console.warn("Dev save endpoint unavailable, falling back to download:", e);
      setSaveStatus({
        type: "error",
        message: "Dev server endpoint unavailable. Please use Download or Copy.",
      });
      setTimeout(() => setSaveStatus({ type: "idle" }), 5000);
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
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Reset to original file values
  const handleResetToDefault = () => {
    if (!window.confirm("Reset all fields back to current file defaults?")) return;
    setTranslationsData({
      en: { ...initialTranslations.en },
      zh: { ...initialTranslations.zh },
      ms: { ...initialTranslations.ms },
    });
    setStationNamesData({ ...initialStationNamesZh });
  };

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Shared Navigation Bar */}
      <DevNavBar activeTab="translations" />

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Globe className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                Translations (i18n)
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Edit and preview English, Chinese, and Malay app translations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:bg-button-secondary transition-all active:scale-95 shadow-sm"
              title="Reset fields"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:bg-button-secondary transition-all active:scale-95 shadow-sm"
              title="Copy Code"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary hover:bg-button-secondary transition-all active:scale-95 shadow-sm"
              title="Download File"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .ts</span>
            </button>

            <button
              onClick={handleSaveToCodebase}
              disabled={saveStatus.type === "saving"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus.type === "saving" ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Save Status Banner (if active) */}
        {saveStatus.type === "success" && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveStatus.message}</span>
          </div>
        )}
        {saveStatus.type === "error" && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border mt-6 pb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none -mx-1 px-1">
            <button
              onClick={() => setActiveTab("ui_keys")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "ui_keys"
                  ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>App Keys ({allKeys.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("station_names")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "station_names"
                  ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Chinese Station Names ({Object.keys(stationNamesData).length})</span>
            </button>

            <button
              onClick={() => setActiveTab("code_preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "code_preview"
                  ? "bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Code Preview</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-[11px] text-text-secondary font-medium">
            {modifiedKeysCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                {modifiedKeysCount} unsaved
              </span>
            )}
            {missingKeysCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                {missingKeysCount} missing
              </span>
            )}
          </div>
        </div>

        {/* ── Main Tab Content ── */}
        <div className="mt-5 space-y-4">
          {/* ── TAB 1: UI Translations Matrix ── */}
          {activeTab === "ui_keys" && (
            <div className="space-y-3.5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keys or text..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-button-secondary/60 border border-border rounded-xl p-1">
                    {(["all", "missing", "modified"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setFilterMode(m)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                          filterMode === m
                            ? "bg-card text-text-primary shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowAddKeyModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-bold whitespace-nowrap shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Key</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-button-secondary/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        <th className="p-3 w-[200px]">Key</th>
                        <th className="p-3">English (en)</th>
                        <th className="p-3">Chinese (zh)</th>
                        <th className="p-3">Malay (ms)</th>
                        <th className="p-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-text-secondary">
                            No keys match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => {
                          const isModified = isKeyModified(r.key);
                          const isMissing = !r.zh.trim() || !r.ms.trim();

                          return (
                            <tr
                              key={r.key}
                              className={`hover:bg-button-secondary/30 transition-colors ${
                                isModified ? "bg-amber-500/5" : ""
                              }`}
                            >
                              <td className="p-3 align-top">
                                <div className="flex items-start gap-1.5">
                                  {isModified && (
                                    <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" title="Modified" />
                                  )}
                                  {isMissing && (
                                    <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" title="Missing" />
                                  )}
                                  <span className="font-mono font-bold text-blue-500 text-[11.5px] break-all">
                                    {r.key}
                                  </span>
                                </div>
                              </td>

                              <td className="p-2.5 align-top">
                                <textarea
                                  value={r.en}
                                  onChange={(e) => handleUpdateTranslation("en", r.key, e.target.value)}
                                  rows={Math.max(1, Math.ceil((r.en.length || 1) / 35))}
                                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500 resize-y min-h-[32px]"
                                />
                              </td>

                              <td className="p-2.5 align-top">
                                <textarea
                                  value={r.zh}
                                  onChange={(e) => handleUpdateTranslation("zh", r.key, e.target.value)}
                                  rows={Math.max(1, Math.ceil((r.zh.length || 1) / 35))}
                                  placeholder="Missing (zh)"
                                  className={`w-full p-2 rounded-xl border text-xs text-text-primary focus:outline-none focus:border-blue-500 resize-y min-h-[32px] ${
                                    !r.zh.trim()
                                      ? "border-rose-500/40 bg-rose-500/5"
                                      : "border-border bg-input"
                                  }`}
                                />
                              </td>

                              <td className="p-2.5 align-top">
                                <textarea
                                  value={r.ms}
                                  onChange={(e) => handleUpdateTranslation("ms", r.key, e.target.value)}
                                  rows={Math.max(1, Math.ceil((r.ms.length || 1) / 35))}
                                  placeholder="Missing (ms)"
                                  className={`w-full p-2 rounded-xl border text-xs text-text-primary focus:outline-none focus:border-blue-500 resize-y min-h-[32px] ${
                                    !r.ms.trim()
                                      ? "border-rose-500/40 bg-rose-500/5"
                                      : "border-border bg-input"
                                  }`}
                                />
                              </td>

                              <td className="p-3 text-center align-middle">
                                <button
                                  onClick={() => handleDeleteKey(r.key)}
                                  className="p-1 rounded-lg text-text-secondary hover:text-rose-500 transition-colors"
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

          {/* ── TAB 2: Station Names ── */}
          {activeTab === "station_names" && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search station English or Chinese names..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => setShowAddStationModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Station</span>
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-button-secondary/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 w-1/2">Station Name (EN)</th>
                        <th className="p-2.5 w-1/2">Chinese Name (ZH)</th>
                        <th className="p-2.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {filteredStations.map(([en, zh], idx) => (
                        <tr key={en} className="hover:bg-button-secondary/30 transition-colors">
                          <td className="p-2.5 text-center text-text-secondary font-mono text-[10.5px]">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-semibold text-text-primary">
                            {en}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={zh}
                              onChange={(e) => handleUpdateStation(en, e.target.value)}
                              className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteStation(en)}
                              className="p-1 rounded-lg text-text-secondary hover:text-rose-500 transition-colors"
                              title="Delete"
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

          {/* ── TAB 3: Code Preview ── */}
          {activeTab === "code_preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>Output target: <code className="font-mono text-blue-500">src/lib/translations.ts</code></span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-text-primary hover:bg-button-secondary transition-all shadow-sm"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl border border-border bg-card font-mono text-xs text-text-primary overflow-x-auto leading-relaxed max-h-[70vh] select-all shadow-inner">
                {generateTranslationsCode()}
              </pre>
            </div>
          )}
        </div>
      </main>

      {/* ── Add Key Modal ── */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-2xl text-text-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Add Translation Key</h3>
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-text-secondary block mb-1">Key Name (camelCase)</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. viewLiveSchedule"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">English (en)</label>
                <input
                  type="text"
                  value={newKeyEn}
                  onChange={(e) => setNewKeyEn(e.target.value)}
                  placeholder="e.g. View Live Schedule"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">Chinese (zh)</label>
                <input
                  type="text"
                  value={newKeyZh}
                  onChange={(e) => setNewKeyZh(e.target.value)}
                  placeholder="e.g. 查看实时班次表"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">Malay (ms)</label>
                <input
                  type="text"
                  value={newKeyMs}
                  onChange={(e) => setNewKeyMs(e.target.value)}
                  placeholder="e.g. Lihat Jadual Langsung"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewKey}
                disabled={!newKeyName.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Station Modal ── */}
      {showAddStationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-2xl text-text-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Add Station Chinese Name</h3>
              <button
                onClick={() => setShowAddStationModal(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-text-secondary block mb-1">Station English / ID Name</label>
                <input
                  type="text"
                  value={newStationEn}
                  onChange={(e) => setNewStationEn(e.target.value)}
                  placeholder="e.g. Subang Jaya"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">Chinese Name (ZH)</label>
                <input
                  type="text"
                  value={newStationZh}
                  onChange={(e) => setNewStationZh(e.target.value)}
                  placeholder="e.g. 梳邦再也"
                  className="w-full p-2 rounded-xl border border-border bg-input text-xs text-text-primary focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowAddStationModal(false)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewStation}
                disabled={!newStationEn.trim() || !newStationZh.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
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
