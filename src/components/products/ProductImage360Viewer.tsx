import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RotateCw, ChevronDown, ChevronRight, Play, Pause, ChevronLeft, ChevronRight as ChevronRightIcon, Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ProductImage360ViewerProps {
  images: string[];
  productName?: string;
}

export function ProductImage360Viewer({ images, productName }: ProductImage360ViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Need at least 3 images for meaningful 360 view
  const hasEnoughImages = images.length >= 3;

  // Auto-play animation
  useEffect(() => {
    if (isPlaying && hasEnoughImages) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, images.length, hasEnoughImages]);

  // Mouse/touch handlers for dragging
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setIsPlaying(false);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !hasEnoughImages) return;

    const diff = clientX - startX;
    const threshold = 30; // pixels needed to move one frame

    if (Math.abs(diff) > threshold) {
      const direction = diff > 0 ? -1 : 1;
      setCurrentIndex((prev) => {
        const newIndex = prev + direction;
        if (newIndex < 0) return images.length - 1;
        if (newIndex >= images.length) return 0;
        return newIndex;
      });
      setStartX(clientX);
    }
  }, [isDragging, startX, images.length, hasEnoughImages]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Navigation buttons
  const goToPrevious = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  if (!hasEnoughImages) {
    return null;
  }

  const ViewerContent = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <div className={`relative ${fullscreen ? 'h-full' : ''}`}>
      <div
        ref={containerRef}
        className={`relative ${fullscreen ? 'h-full' : 'aspect-square'} rounded overflow-hidden bg-muted select-none cursor-grab active:cursor-grabbing`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIndex]}
          alt={`${productName || 'Produto'} - Vista ${currentIndex + 1}`}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        
        {/* Overlay with 360 indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            <RotateCw className="h-3 w-3 mr-1" />
            360°
          </Badge>
        </div>

        {/* Frame counter */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
            {currentIndex + 1} / {images.length}
          </Badge>
        </div>

        {/* Fullscreen button (only in non-fullscreen mode) */}
        {!fullscreen && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}

        {/* Navigation arrows */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full"
          onClick={goToNext}
        >
          <ChevronRightIcon className="h-6 w-6" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <Button
          type="button"
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Animar
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          ou arraste para rodar
        </span>
      </div>

      {/* Image strip */}
      <div className="flex gap-1 mt-3 overflow-x-auto pb-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCurrentIndex(idx);
              setIsPlaying(false);
            }}
            className={`shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-colors ${
              idx === currentIndex ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
            }`}
          >
            <img
              src={img}
              alt={`Frame ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-primary" />
              Visualização 360°
              <Badge variant="secondary" className="ml-1 text-xs">
                {images.length} fotos
              </Badge>
            </span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-3">
            Visualize o produto em 360°. Arraste ou use as setas para rodar. Use "Animar" para rotação automática.
          </p>
          <Card className="p-4">
            <ViewerContent />
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl h-[80vh] p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-10 z-10"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="h-full">
            <ViewerContent fullscreen />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
