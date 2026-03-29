import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";

interface FlipbookZoomLensProps {
  containerRef: React.RefObject<HTMLElement>;
  active: boolean;
  zoomFactor?: number;
}

export function FlipbookZoomLens({ containerRef, active, zoomFactor = 2.5 }: FlipbookZoomLensProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [relPos, setRelPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout>>();

  const LENS_SIZE = 220;

  // Capture snapshot of the container when magnify mode activates or page changes
  const captureSnapshot = useCallback(() => {
    const el = containerRef.current;
    if (!el || !active) return;
    
    html2canvas(el, {
      useCORS: true,
      scale: 2,
      logging: false,
      backgroundColor: null,
    }).then(canvas => {
      setSnapshot(canvas.toDataURL("image/png"));
    }).catch(() => {});
  }, [containerRef, active]);

  useEffect(() => {
    if (active) {
      // Small delay to let render settle
      captureTimer.current = setTimeout(captureSnapshot, 300);
    } else {
      setSnapshot(null);
      setVisible(false);
    }
    return () => { if (captureTimer.current) clearTimeout(captureTimer.current); };
  }, [active, captureSnapshot]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPosition({ x: e.clientX, y: e.clientY });
    setRelPos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  }, [containerRef]);

  const handleMouseEnter = useCallback(() => setVisible(true), []);
  const handleMouseLeave = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !active) return;

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

  // Background position for the zoomed image
  const bgPosX = relPos.x * 100;
  const bgPosY = relPos.y * 100;

  return (
    <AnimatePresence>
      {visible && snapshot && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="fixed pointer-events-none z-[9998] rounded-full shadow-2xl overflow-hidden hidden lg:block"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: position.x - LENS_SIZE / 2,
            top: position.y - LENS_SIZE / 2,
            border: "3px solid rgba(255,255,255,0.25)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 25px 50px -12px rgba(0,0,0,0.5)",
            backgroundImage: `url(${snapshot})`,
            backgroundSize: `${zoomFactor * 100}% ${zoomFactor * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full bg-white/15 absolute" />
            <div className="h-px w-full bg-white/15 absolute" />
          </div>

          {/* Zoom badge */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] font-mono rounded-full px-2 py-0.5">
            {zoomFactor}×
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
