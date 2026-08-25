import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DevNavBar } from "./DevNavBar";
import {
  TrendingUp, BarChart3, RefreshCw, Download, Calendar,
  Layers, ArrowUpRight, ArrowDownRight, Zap, CheckCircle2,
  AlertCircle, Code2, Sparkles, Filter
} from "lucide-react";

export interface RidershipRecord {
  date: string;
  bus_rkl: number | null;
  bus_rkn?: number | null;
  bus_rpn?: number | null;
  rail_lrt_kj: number | null;
  rail_lrt_ampang: number | null;
  rail_mrt_kajang: number | null;
  rail_mrt_pjy: number | null;
  rail_monorail: number | null;
  rail_lrt_shah_alam: number | null;
  rail_komuter?: number | null;
  rail_ets?: number | null;
  [key: string]: unknown;
}

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  text: string;
  category?: string;
}

const SERVICE_CONFIG: {
  id: string;
  key: keyof RidershipRecord;
  name: string;
  shortName: string;
  color: string;
  type: "rail" | "bus";
}[] = [
  { id: "KJ", key: "rail_lrt_kj", name: "LRT Kelana Jaya Line", shortName: "LRT KJ", color: "#ff2e48", type: "rail" },
  { id: "KG", key: "rail_mrt_kajang", name: "MRT Kajang Line", shortName: "MRT Kajang", color: "#1f8f4c", type: "rail" },
  { id: "AG_SP", key: "rail_lrt_ampang", name: "LRT Ampang & Sri Petaling", shortName: "LRT Ampang/SP", color: "#ff8d26", type: "rail" },
  { id: "PY", key: "rail_mrt_pjy", name: "MRT Putrajaya Line", shortName: "MRT Putrajaya", color: "#ffce36", type: "rail" },
  { id: "BUS", key: "bus_rkl", name: "Rapid Bus (Klang Valley)", shortName: "Rapid Bus", color: "#e11d48", type: "bus" },
  { id: "MR", key: "rail_monorail", name: "KL Monorail Line", shortName: "Monorail", color: "#88c946", type: "rail" },
  { id: "SA", key: "rail_lrt_shah_alam", name: "LRT Shah Alam Line", shortName: "LRT Shah Alam", color: "#01abe4", type: "rail" },
  { id: "KTM", key: "rail_komuter", name: "KTM Komuter Central", shortName: "KTM Komuter", color: "#003b71", type: "rail" },
];

export const RapidKLInsightsView: React.FC = () => {
  const [data, setData] = useState<RidershipRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [daysRange, setDaysRange] = useState<number>(30);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "lines" | "api_docs">("overview");

  // API Tester
  const [apiQueryLimit, setApiQueryLimit] = useState<number>(14);
  const [apiRawJson, setApiRawJson] = useState<string>("");
  const [apiIsTesting, setApiIsTesting] = useState<boolean>(false);

  // Toast Queue
  const [toastList, setToastList] = useState<ToastItem[]>([]);

  const showAlert = useCallback((type: "success" | "error" | "info", text: string, category?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToastList((prev) => {
      const filtered = prev.filter((t) => {
        if (category && t.category === category) return false;
        if (!category && t.text === text) return false;
        return true;
      });
      return [...filtered, { id, type, text, category }];
    });
    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToastList((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch from data.gov.my
  const fetchData = useCallback(async (limit: number = 30) => {
    setIsLoading(true);
    try {
      const url = `https://api.data.gov.my/data-catalogue?id=ridership_headline&limit=${limit}&sort=-date`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RidershipRecord[];

      if (Array.isArray(json) && json.length > 0) {
        // Chronological order for time series
        const sorted = [...json].reverse();
        setData(sorted);
        setIsLive(true);
        showAlert("success", `Fetched ${json.length} records from data.gov.my API.`, "fetch");
      }
    } catch (err) {
      console.warn("Live fetch failed, using fallback data:", err);
      setIsLive(false);
      showAlert("info", "Failed to connect to data.gov.my API. Check network connection.", "fetch");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchData(daysRange);
  }, [daysRange, fetchData]);

  // Calculations & Analytics
  const latestRecord = useMemo<RidershipRecord | null>(() => {
    return data.length > 0 ? data[data.length - 1] : null;
  }, [data]);

  const previousRecord = useMemo<RidershipRecord | null>(() => {
    return data.length > 1 ? data[data.length - 2] : null;
  }, [data]);

  // Compute Total Daily Ridership across RapidKL
  const getRecordTotal = useCallback((rec: RidershipRecord | null) => {
    if (!rec) return 0;
    return (
      (rec.rail_lrt_kj || 0) +
      (rec.rail_mrt_kajang || 0) +
      (rec.rail_lrt_ampang || 0) +
      (rec.rail_mrt_pjy || 0) +
      (rec.rail_monorail || 0) +
      (rec.bus_rkl || 0) +
      (rec.rail_lrt_shah_alam || 0)
    );
  }, []);

  const latestTotal = useMemo(() => getRecordTotal(latestRecord), [latestRecord, getRecordTotal]);
  const previousTotal = useMemo(() => getRecordTotal(previousRecord), [previousRecord, getRecordTotal]);
  const growthRate = useMemo(() => {
    if (!previousTotal || previousTotal === 0) return 0;
    return ((latestTotal - previousTotal) / previousTotal) * 100;
  }, [latestTotal, previousTotal]);

  const totalRailRidership = useMemo(() => {
    if (!latestRecord) return 0;
    return (
      (latestRecord.rail_lrt_kj || 0) +
      (latestRecord.rail_mrt_kajang || 0) +
      (latestRecord.rail_lrt_ampang || 0) +
      (latestRecord.rail_mrt_pjy || 0) +
      (latestRecord.rail_monorail || 0) +
      (latestRecord.rail_lrt_shah_alam || 0)
    );
  }, [latestRecord]);

  const totalBusRidership = useMemo(() => {
    if (!latestRecord) return 0;
    return latestRecord.bus_rkl || 0;
  }, [latestRecord]);

  // Service Breakdown Stats
  const serviceStats = useMemo(() => {
    if (data.length === 0) return [];

    return SERVICE_CONFIG.map((srv) => {
      const values = data.map((d) => (d[srv.key] as number) || 0);
      const latestVal = values[values.length - 1] || 0;
      const prevVal = values[values.length - 2] || 0;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / values.length);
      const max = Math.max(...values);
      const srvGrowth = prevVal > 0 ? ((latestVal - prevVal) / prevVal) * 100 : 0;
      const share = latestTotal > 0 ? (latestVal / latestTotal) * 100 : 0;

      return {
        ...srv,
        latestVal,
        prevVal,
        avg,
        max,
        srvGrowth,
        share,
        history: values,
      };
    }).sort((a, b) => b.latestVal - a.latestVal);
  }, [data, latestTotal]);

  // Max value in dataset for chart scaling
  const maxChartValue = useMemo(() => {
    let max = 0;
    data.forEach((d) => {
      if (selectedService === "all") {
        const t = getRecordTotal(d);
        if (t > max) max = t;
      } else {
        const srv = SERVICE_CONFIG.find((s) => s.id === selectedService);
        if (srv) {
          const v = (d[srv.key] as number) || 0;
          if (v > max) max = v;
        }
      }
    });
    return max || 100000;
  }, [data, selectedService, getRecordTotal]);

  const [hoveredPoint, setHoveredPoint] = useState<{ idx: number; date: string; val: number; x: number; y: number } | null>(null);

  const activeLineColor = useMemo(() => {
    if (selectedService === "all") return "#2563eb";
    return SERVICE_CONFIG.find((s) => s.id === selectedService)?.color || "#2563eb";
  }, [selectedService]);

  const formatCompactNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return n.toLocaleString();
  };

  const yAxisTicks = useMemo(() => {
    const steps = 4;
    const ticks = [];
    for (let i = steps; i >= 0; i--) {
      const val = Math.round((maxChartValue / steps) * i);
      ticks.push({
        val,
        label: formatCompactNumber(val),
        ratio: i / steps,
      });
    }
    return ticks;
  }, [maxChartValue]);

  const linePoints = useMemo(() => {
    if (data.length === 0) return [];
    const padLeft = 65;
    const padTop = 45;
    const chartW = 920;
    const chartH = 220;

    return data.map((d, i) => {
      let val = 0;
      if (selectedService === "all") {
        val = getRecordTotal(d);
      } else {
        const srv = SERVICE_CONFIG.find((s) => s.id === selectedService);
        if (srv) val = (d[srv.key] as number) || 0;
      }

      const x = padLeft + (i / Math.max(1, data.length - 1)) * chartW;
      const y = padTop + chartH * (1 - val / Math.max(1, maxChartValue));
      return { x, y, date: d.date, val };
    });
  }, [data, selectedService, maxChartValue, getRecordTotal]);

  const xAxisTicks = useMemo(() => {
    if (linePoints.length === 0) return [];
    const count = Math.min(5, linePoints.length);
    if (count <= 1) return [{ x: linePoints[0].x, date: linePoints[0].date, align: "middle" as const }];

    const step = (linePoints.length - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.min(linePoints.length - 1, Math.round(i * step));
      const pt = linePoints[idx];
      const align: "start" | "middle" | "end" = i === 0 ? "start" : i === count - 1 ? "end" : "middle";
      return { x: pt.x, date: pt.date, align };
    });
  }, [linePoints]);

  const pathD = useMemo(() => {
    if (linePoints.length === 0) return "";
    return linePoints.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
      ""
    );
  }, [linePoints]);

  const areaD = useMemo(() => {
    if (linePoints.length === 0) return "";
    const padTop = 45;
    const chartH = 220;
    const bottomY = padTop + chartH;
    const first = linePoints[0];
    const last = linePoints[linePoints.length - 1];
    return `${pathD} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }, [linePoints, pathD]);

  // Test live API call from Explorer
  const handleRunApiTest = async () => {
    setApiIsTesting(true);
    try {
      const url = `https://api.data.gov.my/data-catalogue?id=ridership_headline&limit=${apiQueryLimit}&sort=-date`;
      const res = await fetch(url);
      const json = await res.json();
      setApiRawJson(JSON.stringify(json, null, 2));
      showAlert("success", "API request succeeded (HTTP 200).", "api_test");
    } catch (e) {
      setApiRawJson(`Error fetching API: ${String(e)}`);
      showAlert("error", "API request failed.", "api_test");
    } finally {
      setApiIsTesting(false);
    }
  };

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const headers = ["date", ...SERVICE_CONFIG.map((s) => s.key)];
    const rows = data.map((d) => [d.date, ...SERVICE_CONFIG.map((s) => d[s.key] || 0)].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapidkl_ridership_${daysRange}d.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showAlert("success", "Exported ridership CSV.", "export");
  };

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col font-sans pb-16 overflow-y-auto select-text">
      {/* Dev Navigation Bar */}
      <DevNavBar activeTab="insights" />

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                RapidKL Ridership & Service Insights
              </h1>
              {isLive ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live data.gov.my API
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Offline Snapshot
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Official Open Data analytics on LRT, MRT, Monorail, and Rapid Bus services powered by Malaysia&apos;s data.gov.my Static Catalogue API.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchData(daysRange)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Refresh API Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh API</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-card hover:bg-button-secondary border border-border transition-all active:scale-95 shadow-sm"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stacked Floating Toast Alerts */}
        {toastList.length > 0 && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] sm:w-auto flex flex-col items-center gap-2 pointer-events-auto">
            {toastList.map((toast) => (
              <div
                key={toast.id}
                className={`px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xl backdrop-blur-xl transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
                  toast.type === "success"
                    ? "bg-card/95 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10"
                    : toast.type === "error"
                    ? "bg-card/95 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-rose-500/10"
                    : "bg-card/95 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-blue-500/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {toast.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : toast.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  ) : (
                    <Zap className="w-4 h-4 shrink-0 text-blue-500" />
                  )}
                  <span className="text-text-primary">{toast.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-text-secondary hover:text-text-primary text-xs p-1 transition-colors rounded-lg hover:bg-button-secondary ml-1"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Top Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          {/* Card 1: Daily Total */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">RapidKL Daily Total</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-text-primary">
                {latestTotal.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px]">
                {growthRate >= 0 ? (
                  <span className="text-emerald-500 font-bold flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{growthRate.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-rose-500 font-bold flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5" />{growthRate.toFixed(1)}%
                  </span>
                )}
                <span className="text-text-secondary truncate">vs prev day</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-text-secondary font-mono">
              Date: {latestRecord?.date || "N/A"}
            </div>
          </div>

          {/* Card 2: Rail Passenger Share */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Rail Riders</span>
                <Layers className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-text-primary">
                {totalRailRidership.toLocaleString()}
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                {latestTotal > 0 ? `${Math.round((totalRailRidership / latestTotal) * 100)}% of RapidKL traffic` : "N/A"}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-text-secondary font-mono">
              LRT, MRT & Monorail
            </div>
          </div>

          {/* Card 3: Rapid Bus Riders */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Rapid Bus (KL)</span>
                <Sparkles className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-text-primary">
                {totalBusRidership.toLocaleString()}
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                {latestTotal > 0 ? `${Math.round((totalBusRidership / latestTotal) * 100)}% of RapidKL traffic` : "N/A"}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-text-secondary font-mono">
              Feeder & Trunk Buses
            </div>
          </div>

          {/* Card 4: Top Service */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider">Busiest Line</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-base font-extrabold text-text-primary truncate">
                {serviceStats[0]?.name || "N/A"}
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                {serviceStats[0]?.latestVal.toLocaleString()} passengers / day
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-text-secondary font-mono">
              Share: {serviceStats[0]?.share.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-6 border-b border-border pb-3 overflow-x-auto no-scrollbar select-none -mx-1 px-1">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === "overview"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ridership Trends</span>
          </button>

          <button
            onClick={() => setActiveSubTab("lines")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === "lines"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Service Breakdown ({SERVICE_CONFIG.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("api_docs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === "api_docs"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-button-secondary"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>API Explorer & Guide</span>
          </button>
        </div>

        {/* ── SUB-TAB 1: RIDERSHIP TREND LINE CHART ── */}
        {activeSubTab === "overview" && (
          <div className="space-y-5 mt-5">
            {/* Filter and Range Controls */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  Line:
                </span>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All RapidKL Services (Combined Total)</option>
                  {SERVICE_CONFIG.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  Horizon:
                </span>
                {[7, 14, 30, 90].map((r) => (
                  <button
                    key={r}
                    onClick={() => setDaysRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      daysRange === r
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-button-secondary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Daily Passenger Traffic (Last {data.length} Days)
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {selectedService === "all"
                      ? "Cumulative daily passengers across rail and bus networks"
                      : `${SERVICE_CONFIG.find((s) => s.id === selectedService)?.name} daily traffic`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-text-primary">
                    Peak: {maxChartValue.toLocaleString()} passengers
                  </span>
                </div>
              </div>

              {/* Line Chart Area */}
              <div className="relative w-full overflow-visible select-none pt-2">
                <svg
                  viewBox="0 0 1000 310"
                  className="w-full h-72 sm:h-96 text-text-secondary"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeLineColor} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={activeLineColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y-Axis Horizontal Grid Lines and Labels */}
                  {yAxisTicks.map((tick, i) => {
                    const y = 45 + 220 * (1 - tick.ratio);
                    return (
                      <g key={i}>
                        {/* Horizontal Grid Line */}
                        <line
                          x1="65"
                          y1={y}
                          x2="985"
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          strokeOpacity="0.15"
                        />
                        {/* Y-Axis Passenger Count Label */}
                        <text
                          x="56"
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[10px] font-mono font-medium fill-current opacity-70"
                        >
                          {tick.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-Axis Baseline */}
                  <line
                    x1="65"
                    y1="265"
                    x2="985"
                    y2="265"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                  />

                  {/* X-Axis Dates & Ticks directly aligned with data points */}
                  {xAxisTicks.map((t, idx) => (
                    <g key={idx}>
                      <line
                        x1={t.x}
                        y1="265"
                        x2={t.x}
                        y2="271"
                        stroke="currentColor"
                        strokeOpacity="0.35"
                      />
                      <text
                        x={t.x}
                        y="288"
                        textAnchor={t.align}
                        className="text-[10px] font-mono fill-current opacity-75"
                      >
                        {t.date}
                      </text>
                    </g>
                  ))}

                  {/* Gradient Area Fill */}
                  {areaD && <path d={areaD} fill="url(#lineChartGradient)" />}

                  {/* Trend Line */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={activeLineColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Hover Guidelines and Active Node */}
                  {hoveredPoint && (
                    <g>
                      {/* Vertical line indicator */}
                      <line
                        x1={hoveredPoint.x}
                        y1="45"
                        x2={hoveredPoint.x}
                        y2="265"
                        stroke={activeLineColor}
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                        strokeOpacity="0.8"
                      />
                      {/* Outer pulse circle */}
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="6"
                        fill={activeLineColor}
                        fillOpacity="0.25"
                      />
                      {/* Center dot */}
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="3.5"
                        fill={activeLineColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Invisible Hit Boxes for Hover Detection */}
                  {linePoints.map((pt, i) => (
                    <rect
                      key={i}
                      x={pt.x - 920 / Math.max(1, linePoints.length * 2)}
                      y="40"
                      width={Math.max(12, 920 / Math.max(1, linePoints.length))}
                      height="230"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ idx: i, date: pt.date, val: pt.val, x: pt.x, y: pt.y })}
                    />
                  ))}
                </svg>

                {/* Floating Tooltip Card with Smart Flip */}
                {hoveredPoint && (
                  <div
                    className={`absolute pointer-events-none z-30 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-2.5 text-xs transition-all duration-75 ${
                      hoveredPoint.y < 105
                        ? "translate-y-4 -translate-x-1/2"
                        : "-translate-y-full -translate-y-3 -translate-x-1/2"
                    }`}
                    style={{
                      left: `${Math.max(12, Math.min(88, (hoveredPoint.x / 1000) * 100))}%`,
                      top: `${(hoveredPoint.y / 310) * 100}%`,
                    }}
                  >
                    <div className="font-mono text-[10px] text-text-secondary">{hoveredPoint.date}</div>
                    <div className="flex items-center gap-1.5 font-bold text-text-primary mt-0.5 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeLineColor }} />
                      <span>{hoveredPoint.val.toLocaleString()} passengers</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-TAB 2: SERVICE BREAKDOWN ── */}
        {activeSubTab === "lines" && (
          <div className="space-y-5 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {serviceStats.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-border/80 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: srv.color }}
                        />
                        <span className="text-xs font-bold text-text-primary">{srv.shortName}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-button-secondary text-text-secondary">
                        {srv.share.toFixed(1)}% share
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-lg font-extrabold text-text-primary">
                        {srv.latestVal.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        Passengers on {latestRecord?.date}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1 text-[11px] text-text-secondary">
                      <div className="flex justify-between">
                        <span>Period Average:</span>
                        <span className="font-mono font-bold text-text-primary">{srv.avg.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peak Day:</span>
                        <span className="font-mono text-text-primary">{srv.max.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Day Change:</span>
                        <span className={srv.srvGrowth >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                          {srv.srvGrowth >= 0 ? `+${srv.srvGrowth.toFixed(1)}%` : `${srv.srvGrowth.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUB-TAB 3: API EXPLORER & GUIDE ── */}
        {activeSubTab === "api_docs" && (
          <div className="space-y-5 mt-5">
            {/* Guide Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-bold text-text-primary">
                  How to Connect to data.gov.my Static Catalogue API
                </h2>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                The Data Catalogue API provides open government data without requiring an API key or authentication.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-sm">
                  <div className="font-bold text-text-primary">1. Endpoint Specification</div>
                  <div className="p-2.5 rounded-xl bg-button-secondary/50 border border-border font-mono text-[11px] text-emerald-600 dark:text-emerald-400 select-all overflow-x-auto shadow-inner">
                    GET https://api.data.gov.my/data-catalogue?id=ridership_headline
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-text-secondary text-[11px] pt-1">
                    <li>
                      <strong className="text-text-primary">id (required)</strong>: Dataset identifier (e.g. <code className="px-1.5 py-0.5 rounded-md bg-button-secondary text-text-primary border border-border font-mono text-[10px]">ridership_headline</code>)
                    </li>
                    <li>
                      <strong className="text-text-primary">limit</strong>: Number of rows to return (default: 100)
                    </li>
                    <li>
                      <strong className="text-text-primary">sort</strong>: Sort order (e.g. <code className="px-1.5 py-0.5 rounded-md bg-button-secondary text-text-primary border border-border font-mono text-[10px]">-date</code> for newest first)
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-sm">
                  <div className="font-bold text-text-primary">2. JavaScript / TypeScript Fetch Example</div>
                  <pre className="p-2.5 rounded-xl bg-button-secondary/50 border border-border font-mono text-[11px] text-blue-600 dark:text-blue-400 overflow-x-auto leading-relaxed select-all shadow-inner">
{`const res = await fetch(
  "https://api.data.gov.my/data-catalogue?id=ridership_headline&limit=30&sort=-date"
);
const data = await res.json();
console.log(data[0].rail_lrt_kj);`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Live API Tester */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Interactive API Tester
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Query <code className="px-1.5 py-0.5 rounded-md bg-button-secondary text-text-primary border border-border font-mono text-[10px]">api.data.gov.my</code> live from your browser and view the JSON response.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Limit:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={apiQueryLimit}
                    onChange={(e) => setApiQueryLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-xs font-mono bg-input border border-border rounded-xl text-text-primary focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleRunApiTest}
                    disabled={apiIsTesting}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95"
                  >
                    {apiIsTesting ? "Testing..." : "Send Request"}
                  </button>
                </div>
              </div>

              {apiRawJson && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span className="font-mono font-bold">Response Payload:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(apiRawJson);
                        showAlert("info", "Copied raw JSON.", "copy");
                      }}
                      className="text-blue-500 hover:underline font-semibold"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-button-secondary/40 border border-border font-mono text-[11px] text-text-primary max-h-72 overflow-y-auto leading-relaxed select-all shadow-inner">
                    {apiRawJson}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
