import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Train, Footprints, Search, X, ArrowUpDown } from "lucide-react";
import { lines, stations, lineStations } from "../lib/transit-data";
import { Footer } from "../components/layout/Footer";
import { useSettings } from "../context/SettingsContext";
import { translateStation } from "../lib/translations";
import { trackEvent } from "../lib/analytics";

function getLineNumberText(lineId: string): string {
  const mapping: Record<string, string> = {
    "AG": "Line 3",
    "SP": "Line 4",
    "KJ": "Line 5",
    "MR": "Line 8",
    "KG": "Line 9",
    "SA": "Line 11",
    "PY": "Line 12",
    "BRT": "Line B1"
  };
  return mapping[lineId] || `Line ${lineId}`;
}

export const LinesView: React.FC = () => {
  const navigate = useNavigate();
  const { language, t, tStation, tLine } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const saved = sessionStorage.getItem("scroll_position_lines");
    if (saved && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = parseInt(saved, 10);
        }
      }, 50);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem("scroll_position_lines", String(e.currentTarget.scrollTop));
  };

  // Read query parameter "?line=KG"
  const queryLine = searchParams.get("line");
  const selectedLineId = queryLine && lines[queryLine.toUpperCase()] ? queryLine.toUpperCase() : "KG";

  const setSelectedLineId = (id: string) => {
    setSearchParams({ line: id });
    setSearchQuery(""); // Clear search when line changes
    trackEvent("select_line", "lines", id);
  };

  const selectedLine = lines[selectedLineId];
  const [isReversed, setIsReversed] = useState(false);

  React.useEffect(() => {
    setIsReversed(false);
  }, [selectedLineId]);

  const rawStations = lineStations[selectedLineId] || [];
  const selectedStations = isReversed ? [...rawStations].reverse() : rawStations;

  const getLineColor = (id: string) => lines[id]?.color || "#6b7280";
  const getLineName = (id: string) => lines[id]?.name || id;

  // Sort: MRT (KG, PY) > LRT (KJ, AG, SP, SA) > Monorail (MR) > BRT (BRT)
  const sortedLineIds = ["KG", "PY", "KJ", "AG", "SP", "SA", "MR", "BRT"];
  const sortedLines = sortedLineIds.map(id => lines[id]).filter(Boolean);

  const getInterchangeCode = (node: any, lineId: string) => {
    return node.codes.find((c: string) => {
      const match = c.match(/^[a-zA-Z]+/);
      let id = match ? match[0] : "";
      if (id === "SB") id = "BRT";
      return id === lineId;
    }) || lineId;
  };

  // Global search matching stations across all lines
  const allStations = Object.entries(stations).map(([name, node]) => ({
    name,
    codes: node.codes,
    lines: node.lines,
    connections: node.connections,
  }));

  const globalFiltered = allStations.filter((st) => {
    const query = searchQuery.toLowerCase().trim();
    const zhName = translateStation(st.name, "zh");
    return (
      st.name.toLowerCase().includes(query) ||
      zhName.toLowerCase().includes(query) ||
      st.codes.some((c) => c.toLowerCase().includes(query))
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in select-none">
      <div className="max-w-4xl mx-auto w-full px-5 py-6 space-y-6 flex-1">
        
        {/* Header with Back Button & Search Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary transition-all active:scale-90 shadow-md flex-shrink-0"
              title={t("backToMap")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{t("exploreNetwork")}</div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                {isSearching ? t("globalSearchResults") : t("transitLines")}
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className={`p-2 rounded-xl border transition-all active:scale-90 shadow-md flex-shrink-0 ${
              showSearch || isSearching
                ? "bg-blue-600/15 border-blue-500 text-blue-500"
                : "border-border bg-card text-text-secondary hover:text-text-primary"
            }`}
            title={t("searchPlaceholder")}
          >
            {showSearch || isSearching ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>

        <div className={language === "zh" ? "zh-body space-y-6 flex-1" : "space-y-6 flex-1"}>
          {/* Search Input field */}
          {(showSearch || isSearching) && (
          <div className="relative animate-fade-in">
            <input
              type="text"
              placeholder={t("searchAllPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-border bg-card text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-blue-500 transition-all shadow-sm"
              autoFocus
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-secondary" />
          </div>
        )}

        {/* Normal layout: Tabs and summary if not searching */}
        {!isSearching && (
          <>
            {/* Lines Selector - Wrapped Tabs */}
            <div className="flex flex-wrap gap-2 pb-2">
              {sortedLines.map((line) => {
                const isSelected = selectedLineId === line.id;
                return (
                  <button
                    key={line.id}
                    onClick={() => setSelectedLineId(line.id)}
                    style={{
                      borderColor: isSelected ? line.color : "var(--border)",
                      backgroundColor: isSelected ? `${line.color}15` : "var(--card)",
                      color: isSelected ? line.color : "var(--text-secondary)",
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 shadow-sm hover:text-text-primary hover:border-text-secondary"
                  >
                    <span
                      style={{ backgroundColor: line.color }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                    {line.id}
                  </button>
                );
              })}
            </div>

            {/* Line Summary */}
            {selectedLine && (() => {
              const isDarkText = ["PY", "SA", "MR"].includes(selectedLine.id);
              const textClass = isDarkText ? "text-slate-950" : "text-white";
              const textMutedClass = isDarkText ? "text-slate-700" : "text-white/80";
              return (
                <div
                  style={{ backgroundColor: selectedLine.color, borderColor: selectedLine.color }}
                  className={`rounded-2xl p-5 border shadow-lg flex items-center justify-between gap-4 ${textClass}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="p-3 rounded-xl bg-white shadow-md flex items-center justify-center flex-shrink-0"
                      style={{ color: selectedLine.color }}
                    >
                      <Train className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex mb-1">
                        <span
                          style={{ color: selectedLine.color }}
                          className="text-[10px] font-black px-2 py-0.5 rounded bg-white shadow-sm font-mono tracking-wider uppercase"
                        >
                          {getLineNumberText(selectedLine.id)}
                        </span>
                      </div>
                      <h2 className={`text-base font-bold leading-tight ${textClass}`}>
                        {tLine(selectedLine.name)}
                      </h2>
                      {language === "zh" && (
                        <div className={`text-[10px] ${textMutedClass} font-medium mt-0.5 leading-none`}>
                          {selectedLine.name}
                        </div>
                      )}
                      <div className={`flex flex-col gap-0.5 mt-1.5 text-[10px] ${textMutedClass} font-medium`}>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {selectedLine.length && (
                            <span>
                              <span className="font-bold">{t("lineLength")}:</span> {selectedLine.length}
                            </span>
                          )}
                          {selectedLine.ridership && (
                            <span>
                              <span className="font-bold">{t("dailyRidership")}:</span> {selectedLine.ridership}
                            </span>
                          )}
                        </div>
                        {selectedLine.hours && (
                          <div className="mt-0.5">
                            <span className="font-bold">{t("hoursOfOperation")}:</span> {selectedLine.hours}
                          </div>
                        )}
                        <div className="mt-0.5">
                          <span className="font-bold">{t("stationsCount")}:</span> {selectedStations.length}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <button
                      onClick={() => {
                        const nextReversed = !isReversed;
                        setIsReversed(nextReversed);
                        trackEvent("reverse_stations_list", "lines", nextReversed ? "reversed" : "standard");
                      }}
                      title="Reverse station list"
                      style={isReversed ? { backgroundColor: "#0f172a", color: selectedLine.color } : { color: selectedLine.color }}
                      className={`p-3 rounded-xl shadow-md flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${
                        isReversed
                          ? "bg-slate-900 hover:bg-slate-800"
                          : "bg-white hover:bg-slate-100"
                      }`}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Global Search Results List */}
        {isSearching ? (
          <div className="space-y-2">
            {globalFiltered.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-sm border border-dashed border-border rounded-2xl bg-card">
                {t("noGlobalSearchMatches")}
              </div>
            ) : (
              globalFiltered.map((st) => {
                const walkwayTransfers = st.connections.filter((c) => c.line === "WALKWAY");
                
                // Show all codes for the station
                return (
                  <div
                    key={st.name}
                    onClick={() => {
                      navigate(`/station/${encodeURIComponent(st.name)}`);
                      trackEvent("click_station_detail", "lines", st.name);
                    }}
                    className="group relative flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-button-secondary/30 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-text-primary group-hover:text-blue-500 transition-colors flex flex-col">
                        <span>{tStation(st.name)}</span>
                        {language === "zh" && (
                          <span className="text-[10px] text-text-secondary font-normal mt-0.5 leading-none">{st.name}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Walkway Transfers */}
                      {walkwayTransfers.map((conn) => {
                        const targetNode = stations[conn.to];
                        return (
                          <div
                            key={conn.to}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary bg-button-secondary/50 border border-border px-2 py-0.5 rounded-xl"
                            title={`${t("walkTo")} ${tStation(conn.to)}`}
                          >
                            <Footprints className="h-3.5 w-3.5 text-text-secondary" />
                            <span className="flex flex-col">
                              <span>{tStation(conn.to)}</span>
                              {language === "zh" && (
                                <span className="text-[8px] font-normal text-text-secondary/80 leading-none mt-0.5">{conn.to}</span>
                              )}
                            </span>
                            {targetNode && (
                              <div className="flex gap-1">
                                {targetNode.codes.map((code) => {
                                  const match = code.match(/^[a-zA-Z]+/);
                                  let lId = match ? match[0] : "";
                                  if (lId === "SB") lId = "BRT";
                                  return (
                                    <span
                                      key={code}
                                      style={{ backgroundColor: getLineColor(lId) }}
                                      className="text-[8px] font-extrabold text-white px-1.5 py-1 rounded leading-none"
                                    >
                                      {code}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Display all station codes */}
                      <div className="flex items-center gap-1.5">
                        {st.codes.map((code) => {
                          const match = code.match(/^[a-zA-Z]+/);
                          let lId = match ? match[0] : "";
                          if (lId === "SB") lId = "BRT";
                          return (
                            <span
                              key={code}
                              style={{ backgroundColor: getLineColor(lId) }}
                              className="text-[9px] font-black text-white px-2 py-0.5 rounded shadow-sm leading-none"
                            >
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Normal Stations List of selected line */
          <div className="space-y-2">
            {selectedStations.map((st, idx) => {
              const node = stations[st.name];
              if (!node) return null;

              // Get interchange lines (excluding this selected line and WALKWAY)
              const interchanges = node.lines.filter(
                (l) => l !== selectedLineId && l !== "WALKWAY"
              );

              // Sort interchanges: SP is rightmost for AG, and AG is rightmost for SP
              const sortedInterchanges = [...interchanges].sort((a, b) => {
                if (selectedLineId === "AG") {
                  if (a === "SP") return 1;
                  if (b === "SP") return -1;
                }
                if (selectedLineId === "SP") {
                  if (a === "AG") return 1;
                  if (b === "AG") return -1;
                }
                return 0;
              });

              // Get walkway transfers
              const walkwayTransfers = node.connections.filter(
                (c) => c.line === "WALKWAY"
              );

              return (
                <div
                  key={`${st.code}-${idx}`}
                  onClick={() => {
                    navigate(`/station/${encodeURIComponent(st.name)}`);
                    trackEvent("click_station_detail", "lines", st.name);
                  }}
                  className="group relative flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-button-secondary/30 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-sm overflow-hidden"
                >
                  {/* Hover line indicator */}
                  <div
                    style={{ backgroundColor: selectedLine.color }}
                    className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  />

                  {/* Left: Station Code & Name */}
                  <div className="flex items-center gap-3.5">
                    <span
                      style={{ backgroundColor: selectedLine.color }}
                      className="text-[10px] font-black text-white py-1 rounded shadow-sm leading-none flex-shrink-0 w-[45px] text-center"
                    >
                      {st.code}
                    </span>
                    <span className="text-sm font-bold text-text-primary group-hover:text-blue-500 transition-colors flex flex-col">
                      <span>{tStation(st.name)}</span>
                      {language === "zh" && (
                        <span className="text-[10px] text-text-secondary font-normal mt-0.5 leading-none">{st.name}</span>
                      )}
                    </span>
                  </div>

                  {/* Right: Interchange Codes and Walkway Icons */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Walkway Transfers FIRST so standard interchanges render to their right */}
                    {walkwayTransfers.map((conn) => {
                      const targetNode = stations[conn.to];
                      return (
                        <div
                          key={conn.to}
                          className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary bg-button-secondary/50 border border-border px-2 py-1 rounded-xl"
                          title={`${t("walkTo")} ${tStation(conn.to)}`}
                        >
                          <Footprints className="h-3.5 w-3.5 text-text-secondary" />
                          <span className="flex flex-col">
                            <span>{tStation(conn.to)}</span>
                            {language === "zh" && (
                              <span className="text-[8px] font-normal text-text-secondary/80 leading-none mt-0.5">{conn.to}</span>
                            )}
                          </span>
                          {targetNode && (
                            <div className="flex gap-1">
                              {targetNode.codes.map((code) => {
                                const match = code.match(/^[a-zA-Z]+/);
                                let lId = match ? match[0] : "";
                                if (lId === "SB") lId = "BRT";
                                return (
                                  <span
                                    key={code}
                                    style={{ backgroundColor: getLineColor(lId) }}
                                    className="text-[8px] font-extrabold text-white px-1.5 py-1 rounded leading-none"
                                  >
                                    {code}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Standard Interchanges SECOND so they occupy the rightmost space */}
                    {sortedInterchanges.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {sortedInterchanges.map((lineId) => {
                          const code = getInterchangeCode(node, lineId);
                          return (
                            <span
                              key={lineId}
                              style={{ backgroundColor: getLineColor(lineId) }}
                              className="text-[9px] font-black text-white px-2 py-1 rounded shadow-sm leading-none"
                              title={getLineName(lineId)}
                            >
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
      
      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 pb-6 flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
};
