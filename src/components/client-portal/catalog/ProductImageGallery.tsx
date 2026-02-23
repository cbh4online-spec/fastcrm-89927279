import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Package, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImageGalleryProps {
  images: string[] | null;
  primaryIndex: number | null;
  productName: string;
}

export function ProductImageGallery({ 
  images, 
  primaryIndex, 
  productName 
}: ProductImageGalleryProps) {
  const imageList = images && images.length > 0 ? images : [];
  const startIndex = primaryIndex ?? 0;
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [zoomOpen, setZoomOpen] = useState(false);

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? imageList.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => 
      prev === imageList.length - 1 ? 0 : prev + 1
    );
  };

  if (imageList.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <Package className="h-24 w-24 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main Image */}
        <div 
          className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-zoom-in group"
          onClick={() => setZoomOpen(true)}
        >
          <img
            src={imageList[currentIndex]}
            alt={`${productName} - Imagem ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Zoom hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
          </div>

          {/* Navigation Arrows */}
          {imageList.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-sm"
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-sm"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Image Counter */}
          {imageList.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
              {currentIndex + 1} / {imageList.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imageList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imageList.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                  currentIndex === index
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
              >
                <img
                  src={image}
                  alt={`${productName} - Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Overlay */}
      {zoomOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setZoomOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setZoomOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {imageList.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <img
            src={imageList[currentIndex]}
            alt={`${productName} - Zoom ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {imageList.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 px-3 py-1 rounded-full text-white text-sm">
              {currentIndex + 1} / {imageList.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
