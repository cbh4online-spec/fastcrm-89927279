import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: string;
  skeletonClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  className,
  aspectRatio,
  skeletonClassName,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !src) return;
    setImgSrc(src);
  }, [isVisible, src]);

  const handleError = () => {
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)} style={aspectRatio ? { aspectRatio } : undefined}>
      {!isLoaded && !hasError && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", skeletonClassName)} />
      )}
      {imgSrc && !hasError && (
        <img
          src={imgSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          decoding="async"
          {...props}
        />
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/40">
          <span className="text-4xl">📦</span>
        </div>
      )}
    </div>
  );
}
