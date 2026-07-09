import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Train, ArrowRight } from "lucide-react";
import { lines, stations, lineStations } from "../lib/transit-data";

export const LinesView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLineId, setSelectedLineId] = useState<string>("KJ");

  const selectedLine = lines[selectedLineId];
  const selectedStations = lineStations[selectedLineId] || [];

  const getLineColor = (id: string) => lines[id]?.color || "#6b7280";
  const getLineName = (id: string) => lines[id]?.name || id;

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

        {/* Lines Selector - Rich Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {Object.values(lines).map((line) => {
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

                {/* Right: Connecting Station and Interchanges */}
                <div className="flex items-center gap-3">
                  {/* Standard Interchanges */}
                  {interchanges.length > 0 && (
                    <div className="flex items-center gap-1">
                      {interchanges.map((lineId) => (
                        <span
                          key={lineId}
                          style={{ backgroundColor: getLineColor(lineId) }}
                          className="text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow-sm leading-none"
                          title={getLineName(lineId)}
                        >
                          {lineId}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Walkway Transfers */}
                  {walkwayTransfers.map((conn) => {
                    const targetNode = stations[conn.to];
                    const targetLines = targetNode?.lines.filter((l) => l !== "WALKWAY") ?? [];
                    return (
                      <div
                        key={conn.to}
                        className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary bg-button-secondary/50 border border-border px-2.5 py-1 rounded-xl"
                      >
                        <span>Transfer to {conn.to}</span>
                        {targetLines.map((lineId) => (
                          <span
                            key={lineId}
                            style={{ backgroundColor: getLineColor(lineId) }}
                            className="w-1.5 h-1.5 rounded-full"
                            title={getLineName(lineId)}
                          />
                        ))}
                      </div>
                    );
                  })}

                  <ArrowRight className="h-4 w-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
