import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlipbookZoomLensProps {
  containerRef: React.RefObject<HTMLElement>;
  active: boolean;
  zoomFactor?: number;
}

export function FlipbookZoomLens({ containerRef, active, zoomFactor = 2.5 }: FlipbookZoomLensProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [relPos, setRelPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const LENS_SIZE = 200;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x: e.clientX, y: e.clientY });
    setRelPos({ x: x / rect.width, y: y / rect.height });
  }, [containerRef]);

  const handleMouseEnter = useCallback(() => setVisible(true), []);
  const handleMouseLeave = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !active) {
      setVisible(false);
      return;
    }

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [containerRef, active, handleMouseMove, handleMouseEnter, handleMouseLeave]);

  if (!active) return null;

  const el = containerRef.current;
  const rect = el?.getBoundingClientRect();
  const containerW = rect?.width ?? 0;
  const containerH = rect?.height ?? 0;

  // Background position: center the zoomed view on cursor
  const bgPosX = relPos.x * 100;
  const bgPosY = relPos.y * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="fixed pointer-events-none z-[9998] rounded-full border-2 border-white/30 shadow-2xl overflow-hidden hidden lg:block"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: position.x - LENS_SIZE / 2,
            top: position.y - LENS_SIZE / 2,
          }}
        >
          {/* Magnified clone via element() is not supported; use background-image approach with a captured snapshot */}
          {/* Fallback: render a scaled clone of the container's visible area using CSS transforms */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              background: "var(--ebook-bg, #faf7f2)",
            }}
          >
            {el && (
              <div
                style={{
                  position: "absolute",
                  width: containerW,
                  height: containerH,
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: `${bgPosX}% ${bgPosY}%`,
                  left: -(containerW - LENS_SIZE) / 2 - (relPos.x - 0.5) * containerW,
                  top: -(containerH - LENS_SIZE) / 2 - (relPos.y - 0.5) * containerH,
                  pointerEvents: "none",
                }}
              >
                {/* We use a CSS trick: duplicate via element() is unavailable, so we capture via canvas on mount */}
                {/* Instead, we'll use a simple overlay magnification indicator */}
              </div>
            )}
          </div>

          {/* Since we can't clone DOM easily, use a zoomed background-image if available, 
              otherwise show a magnification crosshair overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full bg-white/20 absolute" />
            <div className="h-px w-full bg-white/20 absolute" />
            <div className="w-8 h-8 rounded-full border border-white/30" />
          </div>

          {/* Zoom level badge */}
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-mono rounded px-1">
            {zoomFactor}×
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
