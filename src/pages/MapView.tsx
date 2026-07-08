import React, { useState, useRef, useEffect } from "react";
import { RotateCcw, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";

export const MapView: React.FC = () => {
  const [mapType, setMapType] = useState<"standard" | "upcoming">("standard");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const mapUrl =
    mapType === "standard"
      ? "maps/Klang Valley Rail Map.jpg"
      : "maps/Circle Line.jpg";

  // Reset zoom & pan
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };



  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1 && position.x === 0 && position.y === 0) {
      // Allow drag to start anyway
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale((prev) => {
      const nextScale = prev + direction * zoomFactor;
      return Math.max(0.5, Math.min(nextScale, 4));
    });
  };

  // Mobile Touch handlers (includes pinch to zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastTouchDistance.current;
      setScale((prev) => {
        const nextScale = prev + delta * 0.007;
        return Math.max(0.5, Math.min(nextScale, 4));
      });
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  // Disable browser pull-to-refresh on mobile map page
  useEffect(() => {
    const preventDefault = (e: Event) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchmove", preventDefault, { passive: false });
    return () => document.removeEventListener("touchmove", preventDefault);
  }, []);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden select-none">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md">
        <button
          onClick={handleReset}
          className="rounded-xl p-2.5 text-text-secondary hover:bg-button-secondary hover:text-text-primary transition-all active:scale-90"
          title="Reset View"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Floating Toggle Map Type Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() =>
            setMapType((prev) => (prev === "standard" ? "upcoming" : "standard"))
          }
          className="flex items-center gap-2 rounded-2xl border border-border bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-blue-700 transition-all active:scale-95 select-none"
        >
          <MapIcon className="h-4 w-4" />
          {mapType === "standard" ? "Show Upcoming Circle Line" : "Show Standard Map"}
        </button>
      </div>

      {/* Interactive Map Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <motion.div
          style={{
            x: position.x,
            y: position.y,
            scale: scale,
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          <img
            ref={imageRef}
            src={mapUrl}
            alt="Klang Valley Rail Map"
            className="pointer-events-none select-none min-w-[100vw] min-h-[80vh] md:min-w-0 md:min-h-0 md:max-h-[90vh] object-cover md:object-contain rounded-lg shadow-2xl border border-border"
          />
        </motion.div>
      </div>
    </div>
  );
};
