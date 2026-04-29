import { ReactNode, useRef, useState, useCallback, TouchEvent } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  /** Distance in px to trigger a refresh */
  threshold?: number;
  /** Disable on tablet+/desktop */
  mobileOnly?: boolean;
  className?: string;
}

/**
 * iOS-style pull-to-refresh wrapper.
 * - Only triggers when the inner scroll container is at scrollTop = 0.
 * - Uses CSS transforms for smoothness (no layout reflow).
 * - Shows a spinner once the threshold is reached.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  mobileOnly = true,
  className,
}: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = () => {
    const el = containerRef.current;
    if (!el) return false;
    // Check the nearest scrollable ancestor
    let parent: HTMLElement | null = el;
    while (parent && parent !== document.body) {
      const oy = window.getComputedStyle(parent).overflowY;
      if (oy === "auto" || oy === "scroll") {
        return parent.scrollTop <= 0;
      }
      parent = parent.parentElement;
    }
    return window.scrollY <= 0;
  };

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing) return;
    if (!isAtTop()) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }, [refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (refreshing || startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Resistance curve so it feels rubbery
      const eased = Math.min(threshold * 1.5, dy * 0.5);
      setPull(eased);
    }
  }, [refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    startY.current = null;
    if (pull >= threshold && !refreshing) {
      setRefreshing(true);
      haptics.success();
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, threshold, refreshing, onRefresh]);

  const ready = pull >= threshold;

  return (
    <div
      ref={containerRef}
      onTouchStart={mobileOnly ? onTouchStart : undefined}
      onTouchMove={mobileOnly ? onTouchMove : undefined}
      onTouchEnd={mobileOnly ? onTouchEnd : undefined}
      className={cn("relative", className)}
    >
      <div
        aria-hidden
        className="absolute left-0 right-0 -top-12 flex items-center justify-center transition-opacity"
        style={{
          opacity: pull > 10 || refreshing ? 1 : 0,
          transform: `translateY(${Math.min(pull, threshold)}px)`,
        }}
      >
        <div className="bg-card border border-border rounded-full h-9 w-9 flex items-center justify-center shadow-md">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={cn(
                "h-4 w-4 transition-transform",
                ready ? "text-primary rotate-180" : "text-muted-foreground"
              )}
            />
          )}
        </div>
      </div>
      <div
        style={{
          transform: refreshing ? `translateY(${threshold * 0.6}px)` : `translateY(${pull * 0.6}px)`,
          transition: pull === 0 || refreshing ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
