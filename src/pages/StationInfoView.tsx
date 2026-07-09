import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stations, lines } from "../lib/transit-data";
import type { StationObj } from "../lib/transit-data";
import { ArrowLeft, Clock, Calendar, ArrowRight, Train, ChevronDown, ChevronUp } from "lucide-react";
import { Footer } from "../components/layout/Footer";
import stationSchedules from "../../public/station_schedules.json";

export const StationInfoView: React.FC = () => {
  const { stationName } = useParams<{ stationName: string }>();
  const navigate = useNavigate();
  const [isTimetableExpanded, setIsTimetableExpanded] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tick current time for countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const decodedName = stationName ? decodeURIComponent(stationName) : "";
  const station: StationObj | undefined = stations[decodedName];

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-lg font-bold text-text-primary mb-2">Station Not Found</h2>
        <p className="text-xs text-text-secondary mb-4">The station "{decodedName}" does not exist in our network.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md"
        >
          Back to Map
        </button>
      </div>
    );
  }

  // Get line metadata for this station
  const stationLines = station.codes.map((code) => {
    const match = code.match(/^[a-zA-Z]+/);
    let lineId = match ? match[0] : "";
    if (lineId === "SB") {
      lineId = "BRT";
    }
    return lineId;
  }).filter((value, index, self) => self.indexOf(value) === index); // unique

  // Determine operational terminals and directions
  const getDirectionsForLine = (lineId: string) => {
    const terminalMapping: Record<string, { term1: string; term2: string }> = {
      "KJ": { term1: "Gombak", term2: "Putra Heights" },
      "AG": { term1: "Sentul Timur", term2: "Ampang" },
      "SP": { term1: "Sentul Timur", term2: "Putra Heights" },
      "KG": { term1: "Kwasa Damansara", term2: "Kajang" },
      "PY": { term1: "Kwasa Damansara", term2: "Putrajaya Sentral" },
      "MR": { term1: "KL Sentral", term2: "Titiwangsa" },
      "BRT": { term1: "Sunway-Setia Jaya", term2: "USJ 7" },
      "SA": { term1: "Bandar Utama", term2: "Johan Setia" },
    };

    const terms = terminalMapping[lineId];
    if (!terms) return [];

    const dirs = [];
    if (decodedName !== terms.term1) {
      dirs.push({ destination: terms.term1, directionId: 1 });
    }
    if (decodedName !== terms.term2) {
      dirs.push({ destination: terms.term2, directionId: 2 });
    }
    return dirs;
  };

  const getDayType = () => {
    const day = currentTime.getDay();
    if (day === 0) return "sunday";
    if (day === 6) return "saturday";
    return "weekday";
  };

  const getTimesForDirection = (lineId: string, destName: string): string[] => {
    const normSearchName = decodedName.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Find the station key matching normalized name
    const matchedKey = Object.keys(stationSchedules).find(k =>
      k.toLowerCase().replace(/[^a-z0-9]/g, "") === normSearchName
    );
    if (!matchedKey) return [];

    const stationData = (stationSchedules as any)[matchedKey];
    if (!stationData || !stationData[lineId]) return [];

    const destNorm = destName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const schedKey = Object.keys(stationData[lineId]).find(k =>
      k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(destNorm)
    );
    if (!schedKey) return [];

    const dayType = getDayType();
    return stationData[lineId][schedKey][dayType] || [];
  };

  // Generate real departure countdowns from GTFS stop_times
  const getDepartures = (lineId: string, destName: string) => {
    const times = getTimesForDirection(lineId, destName);
    const currentHH = currentTime.getHours();
    const currentMM = currentTime.getMinutes();
    const currentTotalMin = currentHH * 60 + currentMM;

    if (times.length === 0) {
      // Fallback if no real GTFS matches
      const nameHash = decodedName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const interval = lineId === "MR" || lineId === "BRT" ? 6 : 5;
      const currentMins = currentTime.getMinutes() + currentTime.getSeconds() / 60;
      const offset = (nameHash + destName.charCodeAt(0)) % interval;
      const timeUntilNext = interval - ((currentMins - offset + interval) % interval);
      
      const minutesList = [
        Math.round(timeUntilNext),
        Math.round(timeUntilNext + interval),
        Math.round(timeUntilNext + interval * 2)
      ].map(m => m === 0 ? 1 : m);

      return minutesList.map(mins => {
        const depTime = new Date(currentTime.getTime() + mins * 60 * 1000);
        const hh = String(depTime.getHours()).padStart(2, "0");
        const mm = String(depTime.getMinutes()).padStart(2, "0");
        return { mins, timeStr: `${hh}:${mm}` };
      });
    }

    // Map each scheduled departure to minutes until departure
    const upcoming = times
      .map(t => {
        const [h, m] = t.split(":").map(Number);
        let totalMin = h * 60 + m;
        if (totalMin < currentTotalMin) {
          totalMin += 24 * 60; // wraps around midnight
        }
        return { timeStr: t, mins: totalMin - currentTotalMin };
      })
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 3);

    return upcoming;
  };

  // Generate full hourly timetables list from GTFS
  const getTimetable = (lineId: string, destName: string) => {
    const times = getTimesForDirection(lineId, destName);
    if (times.length > 0) return times;

    // Fallback if no GTFS found
    const list = [];
    const nameHash = decodedName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (nameHash + destName.charCodeAt(0)) % 5;
    
    for (let hour = 6; hour <= 23; hour++) {
      for (let min = offset; min < 60; min += 5) {
        if (hour === 23 && min > 45) continue;
        const hh = String(hour).padStart(2, "0");
        const mm = String(min).padStart(2, "0");
        list.push(`${hh}:${mm}`);
      }
    }
    return list;
  };

  const getLineColor = (lineId: string) => {
    return lines[lineId]?.color || "#6b7280";
  };

  const getLineName = (lineId: string) => {
    return lines[lineId]?.name || lineId;
  };

  const toggleTimetable = (key: string) => {
    setIsTimetableExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-text-primary overflow-y-auto animate-fade-in">
      <div className="max-w-2xl mx-auto w-full px-5 py-6 space-y-6 flex-1">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl border border-border bg-card text-text-secondary hover:text-text-primary transition-all active:scale-90 shadow-md"
            title="Go back to Map"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Station Information</div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              {decodedName}
            </h1>
          </div>
        </div>

        {/* Station Card Info */}
        <div className="glass-panel rounded-2xl p-5 border border-border bg-card shadow-xl space-y-4">
          <div className="flex gap-2 flex-wrap">
            {station.codes.map((code) => {
              const match = code.match(/^[a-zA-Z]+/);
              let lineId = match ? match[0] : "";
              if (lineId === "SB") {
                lineId = "BRT";
              }
              const color = getLineColor(lineId);
              return (
                <span
                  key={code}
                  style={{ backgroundColor: color }}
                  className="text-xs font-extrabold text-white px-2.5 py-1 rounded shadow-sm"
                >
                  {code}
                </span>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-3 border-t border-border/80">
            <div className="flex items-center gap-2 text-xs text-text-secondary font-semibold">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span>Operational Hours: </span>
              <span className="text-text-primary">06:00 AM - 11:30 PM</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary font-semibold">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Days of Operation: </span>
              <span className="text-text-primary">Daily (Mon - Sun)</span>
            </div>
          </div>
        </div>

        {/* Departures lists per Line */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary select-none">
            Next Departures
          </h2>

          {stationLines.map((lineId) => {
            const directions = getDirectionsForLine(lineId);
            const lineColor = getLineColor(lineId);

            return (
              <div key={lineId} className="glass-panel rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
                <div style={{ borderLeftColor: lineColor }} className="p-4 border-l-4 bg-button-secondary/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Train style={{ color: lineColor }} className="h-5 w-5" />
                    <span className="text-sm font-bold text-text-primary">{getLineName(lineId)}</span>
                  </div>
                </div>

                <div className="p-5 divide-y divide-border/60">
                  {directions.length === 0 ? (
                    <div className="text-xs text-text-secondary italic text-center py-4">No scheduled services.</div>
                  ) : (
                    directions.map((dir) => {
                      const key = `${lineId}_${dir.destination}`;
                      const departures = getDepartures(lineId, dir.destination);
                      const isExpanded = isTimetableExpanded[key] || false;
                      const timetable = getTimetable(lineId, dir.destination);

                      return (
                        <div key={dir.destination} className="py-4 first:pt-0 last:pb-0 space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Towards</span>
                              <span className="text-sm font-bold text-text-primary flex items-center gap-1.5 mt-1">
                                <ArrowRight className="h-4 w-4 text-text-secondary" />
                                {dir.destination}
                              </span>
                            </div>

                            {/* Departure countdown badges */}
                            <div className="flex gap-2">
                              {departures.map((dep, dIdx) => (
                                <div
                                  key={dIdx}
                                  className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border text-center min-w-[64px] ${
                                    dIdx === 0
                                      ? "bg-blue-600/10 border-blue-500/35 text-blue-500"
                                      : "bg-button-secondary/30 border-border text-text-primary"
                                  }`}
                                >
                                  <span className="text-xs font-extrabold">{dep.mins}m</span>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-text-secondary mt-0.5">{dep.timeStr}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Full Timetable Accordion trigger */}
                          <div className="pt-1">
                            <button
                              onClick={() => toggleTimetable(key)}
                              className="flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors uppercase tracking-wider"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Hide Full Timetable
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  View Full Timetable
                                </>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 p-4 rounded-xl border border-border bg-button-secondary/15 animate-fade-in max-h-48 overflow-y-auto">
                                <div className="grid grid-cols-4 gap-2">
                                  {timetable.map((time, tIdx) => (
                                    <div key={tIdx} className="text-center px-2 py-1 rounded border border-border/40 bg-card text-xs font-semibold text-text-secondary select-none">
                                      {time}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 pb-6 flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
};
