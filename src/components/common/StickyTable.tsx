import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface StickyTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export function StickyTableWrapper({ 
  children, 
  className,
  minWidth = "1400px"
}: StickyTableWrapperProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [hasScrolled, setHasScrolled] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const canScroll = el.scrollWidth > el.clientWidth;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    
    setCanScrollRight(canScroll && !atEnd);
    setHasScrolled(el.scrollLeft > 0);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className={cn("relative", className)}>
      <div 
        ref={scrollRef}
        className="overflow-x-auto"
      >
        <table 
          className={cn(
            "w-full caption-bottom text-sm",
            minWidth && `min-w-[${minWidth}]`
          )}
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
      
      {/* Scroll indicator - right side */}
      {canScrollRight && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none flex items-center justify-end pr-2 bg-gradient-to-l from-card via-card/80 to-transparent"
          aria-hidden="true"
        >
          <div className="flex items-center gap-0.5 text-muted-foreground animate-pulse">
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </div>
        </div>
      )}
      
      {/* Shadow for sticky column when scrolled */}
      {hasScrolled && (
        <div 
          className="absolute left-[40px] top-0 bottom-0 w-4 pointer-events-none bg-gradient-to-r from-black/5 to-transparent dark:from-white/5"
          style={{ left: 'calc(40px + 200px)' }} /* Checkbox width + Name column width */
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Styles for sticky cells
export const stickyCheckboxStyles = "sticky left-0 z-20 bg-card";
export const stickyNameStyles = "sticky left-[40px] z-20 bg-card";
export const stickyHeaderCheckboxStyles = "sticky left-0 z-30 bg-muted/50";
export const stickyHeaderNameStyles = "sticky left-[40px] z-30 bg-muted/50";
