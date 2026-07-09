import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Train, Footprints } from "lucide-react";
import { lines, stations, lineStations } from "../lib/transit-data";

export const LinesView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read query parameter "?line=KG"
  const queryLine = searchParams.get("line");
  const selectedLineId = queryLine && lines[queryLine.toUpperCase()] ? queryLine.toUpperCase() : "KG";

  const setSelectedLineId = (id: string) => {
    setSearchParams({ line: id });
  };

  const selectedLine = lines[selectedLineId];
  const selectedStations = lineStations[selectedLineId] || [];

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

  return (
    <div className="flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in select-none">
      <div className="max-w-4xl mx-auto w-full px-5 py-6 space-y-6 flex-1">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary transition-all active:scale-90 shadow-md flex-shrink-0"
            title="Back to Map"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Explore Network</div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Transit Lines</h1>
          </div>
        </div>

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
        {selectedLine && (
          <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                style={{ backgroundColor: selectedLine.color }}
                className="p-3 rounded-xl text-white shadow-md flex items-center justify-center animate-pulse"
              >
                <Train className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary leading-tight">
                  {selectedLine.name}
                </h2>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mt-0.5">
                  Route Code: {selectedLine.id}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-text-primary leading-none">
                {selectedStations.length}
              </span>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">
                Stations
              </p>
            </div>
          </div>
        )}

        {/* Stations List */}
        <div className="space-y-2">
          {selectedStations.map((st, idx) => {
            const node = stations[st.name];
            if (!node) return null;

            // Get interchange lines (excluding this selected line and WALKWAY)
            const interchanges = node.lines.filter(
              (l) => l !== selectedLineId && l !== "WALKWAY"
            );

            // Get walkway transfers
            const walkwayTransfers = node.connections.filter(
              (c) => c.line === "WALKWAY"
            );

            return (
              <div
                key={`${st.code}-${idx}`}
                onClick={() => navigate(`/station/${encodeURIComponent(st.name)}`)}
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
                    className="text-[10px] font-black text-white px-2 py-0.5 rounded shadow-sm leading-none flex-shrink-0"
                  >
                    {st.code}
                  </span>
                  <span className="text-sm font-bold text-text-primary group-hover:text-blue-500 transition-colors">
                    {st.name}
                  </span>
                </div>

                {/* Right: Interchange Codes and Walkway Icons */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Standard Interchanges */}
                  {interchanges.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {interchanges.map((lineId) => {
                        const code = getInterchangeCode(node, lineId);
                        return (
                          <span
                            key={lineId}
                            style={{ backgroundColor: getLineColor(lineId) }}
                            className="text-[9px] font-black text-white px-2 py-0.5 rounded shadow-sm leading-none"
                            title={getLineName(lineId)}
                          >
                            {code}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Walkway Transfers */}
                  {walkwayTransfers.map((conn) => {
                    const targetNode = stations[conn.to];
                    return (
                      <div
                        key={conn.to}
                        className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary bg-button-secondary/50 border border-border px-2 py-0.5 rounded-xl"
                        title={`Walkway to ${conn.to}`}
                      >
                        <Footprints className="h-3.5 w-3.5 text-text-secondary" />
                        <span>{conn.to}</span>
                        {targetNode && (
                          <div className="flex gap-1">
                            {targetNode.codes.map((code) => {
                              const match = code.match(/^[a-zA-Z]+/);
                              let lineId = match ? match[0] : "";
                              if (lineId === "SB") lineId = "BRT";
                              return (
                                <span
                                  key={code}
                                  style={{ backgroundColor: getLineColor(lineId) }}
                                  className="text-[8px] font-extrabold text-white px-1 py-0.5 rounded leading-none"
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
