import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Package } from "lucide-react";

interface StoreImageZoomProps {
  src: string;
  alt: string;
}

export function StoreImageZoom({ src, alt }: StoreImageZoomProps) {
  const [zoomed, setZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [showLens, setShowLens] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x, y });
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="aspect-square overflow-hidden rounded-2xl bg-muted border relative cursor-zoom-in group"
        onMouseEnter={() => setShowLens(true)}
        onMouseLeave={() => setShowLens(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setZoomed(true)}
      >
        <motion.img
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />

        {/* Desktop zoom lens preview */}
        {showLens && (
          <div
            className="absolute top-0 right-0 translate-x-[105%] w-80 h-80 rounded-xl border shadow-xl overflow-hidden bg-background z-30 hidden lg:block pointer-events-none"
          >
            <img
              src={src}
              alt={alt}
              className="absolute w-[200%] h-[200%] max-w-none"
              style={{
                left: `${-lensPos.x * 2}%`,
                top: `${-lensPos.y * 2}%`,
              }}
            />
          </div>
        )}

        {/* Crosshair indicator */}
        {showLens && (
          <div
            className="absolute w-20 h-20 border-2 border-primary/50 rounded-lg pointer-events-none hidden lg:block"
            style={{
              left: `${lensPos.x}%`,
              top: `${lensPos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </div>

      {/* Mobile fullscreen dialog */}
      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain rounded-xl"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
