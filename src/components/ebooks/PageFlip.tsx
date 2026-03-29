import { useState, useRef, useCallback, useEffect } from "react";
import { FlipbookPage, FlipbookPageData } from "./FlipbookPage";

interface PageFlipProps {
  pages: FlipbookPageData[];
  currentSpread: number; // index of left page (always even)
  onFlipForward: () => void;
  onFlipBackward: () => void;
  pageHeight: string;
  pageWidth: string;
}

export function PageFlip({
  pages,
  currentSpread,
  onFlipForward,
  onFlipBackward,
  pageHeight,
  pageWidth,
}: PageFlipProps) {
  const [flipAngle, setFlipAngle] = useState(0); // 0 = flat right, -180 = flat left
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">("forward");
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartAngle = useRef(0);

  const leftPageIdx = currentSpread;
  const rightPageIdx = currentSpread + 1;
  const hasLeft = leftPageIdx >= 0 && leftPageIdx < pages.length;
  const hasRight = rightPageIdx >= 0 && rightPageIdx < pages.length;

  // Auto-flip animation
  const animateFlip = useCallback((target: number, onComplete: () => void) => {
    setIsFlipping(true);
    const duration = 600;
    const start = performance.now();
    const startAngle = flipAngle;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-in-out cubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const current = startAngle + (target - startAngle) * eased;
      setFlipAngle(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setFlipAngle(0);
        setIsFlipping(false);
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  }, [flipAngle]);

  // Flip forward (turn right page to left)
  const flipForward = useCallback(() => {
    if (isFlipping || !hasRight || rightPageIdx + 1 >= pages.length) return;
    setFlipDirection("forward");
    animateFlip(-180, onFlipForward);
  }, [isFlipping, hasRight, rightPageIdx, pages.length, animateFlip, onFlipForward]);

  // Flip backward (turn left page back to right)
  const flipBackward = useCallback(() => {
    if (isFlipping || currentSpread <= 0) return;
    setFlipDirection("backward");
    setFlipAngle(-180);
    animateFlip(0, () => {});
    // We need to go back first, then animate
    onFlipBackward();
  }, [isFlipping, currentSpread, animateFlip, onFlipBackward]);

  // Drag handling
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isFlipping) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const relX = e.clientX - rect.left;
    const isRightHalf = relX > rect.width / 2;
    
    if (isRightHalf && hasRight && rightPageIdx + 1 < pages.length) {
      setIsDragging(true);
      setFlipDirection("forward");
      dragStartX.current = e.clientX;
      dragStartAngle.current = 0;
    } else if (!isRightHalf && currentSpread > 0) {
      setIsDragging(true);
      setFlipDirection("backward");
      dragStartX.current = e.clientX;
      dragStartAngle.current = -180;
      setFlipAngle(-180);
      onFlipBackward();
    }
  }, [isFlipping, hasRight, rightPageIdx, pages.length, currentSpread, onFlipBackward]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const deltaX = e.clientX - dragStartX.current;
    
    let angle: number;
    if (flipDirection === "forward") {
      // Dragging left decreases angle (0 to -180)
      angle = Math.max(-180, Math.min(0, (deltaX / halfWidth) * -180));
    } else {
      // Dragging right increases angle (-180 to 0)
      angle = Math.max(-180, Math.min(0, -180 + (deltaX / halfWidth) * 180));
    }
    setFlipAngle(angle);
  }, [isDragging, flipDirection]);

  const onMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = -90;
    if (flipDirection === "forward") {
      if (flipAngle < threshold) {
        // Complete the flip
        animateFlip(-180, onFlipForward);
      } else {
        // Snap back
        animateFlip(0, () => {});
      }
    } else {
      if (flipAngle > threshold) {
        // Complete the flip back (page already moved, snap to 0)
        animateFlip(0, () => {});
      } else {
        // Snap back to -180 and restore forward
        animateFlip(-180, () => {
          setFlipAngle(0);
          onFlipForward(); // go back forward since we pre-moved
        });
      }
    }
  }, [isDragging, flipAngle, flipDirection, animateFlip, onFlipForward]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [isDragging, onMouseMove, onMouseUp]);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isFlipping) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const relX = touch.clientX - rect.left;
    const isRightHalf = relX > rect.width / 2;

    if (isRightHalf && hasRight && rightPageIdx + 1 < pages.length) {
      setIsDragging(true);
      setFlipDirection("forward");
      dragStartX.current = touch.clientX;
    } else if (!isRightHalf && currentSpread > 0) {
      setIsDragging(true);
      setFlipDirection("backward");
      dragStartX.current = touch.clientX;
      setFlipAngle(-180);
      onFlipBackward();
    }
  }, [isFlipping, hasRight, rightPageIdx, pages.length, currentSpread, onFlipBackward]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const deltaX = e.touches[0].clientX - dragStartX.current;

    let angle: number;
    if (flipDirection === "forward") {
      angle = Math.max(-180, Math.min(0, (deltaX / halfWidth) * -180));
    } else {
      angle = Math.max(-180, Math.min(0, -180 + (deltaX / halfWidth) * 180));
    }
    setFlipAngle(angle);
  }, [isDragging, flipDirection]);

  const onTouchEnd = useCallback(() => {
    onMouseUp();
  }, [onMouseUp]);

  // Pages for the flip leaf
  // Forward: front = current right page, back = next left page (rightPageIdx + 1)
  // Backward: handled by pre-moving the spread
  const flipFrontPage = hasRight ? pages[rightPageIdx] : null;
  const flipBackPage = rightPageIdx + 1 < pages.length ? pages[rightPageIdx + 1] : null;

  // For single-page mode (mobile), show one page at a time
  const isSinglePage = false; // Could be responsive later

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${pageHeight}`}
      style={{
        perspective: "1800px",
        width: pageWidth === "w-full max-w-[580px]" ? "100%" : undefined,
        maxWidth: "1000px",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Book container — two pages side by side */}
      <div className="relative w-full h-full flex" style={{ transformStyle: "preserve-3d" }}>
        
        {/* Left page (static) */}
        <div className="w-1/2 h-full relative overflow-hidden rounded-l-lg shadow-inner"
          style={{ 
            boxShadow: "inset -4px 0 12px rgba(0,0,0,0.15)",
          }}
        >
          {hasLeft ? (
            <FlipbookPage page={pages[leftPageIdx]} />
          ) : (
            <div className="w-full h-full bg-[#f5f0e8]" />
          )}
          {/* Inner shadow along spine */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
        </div>

        {/* Right page (static — visible when no flip or under the flipping leaf) */}
        <div className="w-1/2 h-full relative overflow-hidden rounded-r-lg"
          style={{
            boxShadow: "inset 4px 0 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* Show the page that will be revealed after flip */}
          {flipBackPage && (flipAngle !== 0 || isFlipping || isDragging) ? (
            <FlipbookPage page={flipBackPage} />
          ) : hasRight ? (
            <FlipbookPage page={pages[rightPageIdx]} />
          ) : (
            <div className="w-full h-full bg-[#f5f0e8]" />
          )}
          {/* Inner shadow along spine */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
        </div>

        {/* Flipping leaf — only visible during flip */}
        {(flipAngle !== 0 || isDragging) && flipFrontPage && (
          <div
            className="absolute top-0 w-1/2 h-full"
            style={{
              left: "50%",
              transformOrigin: "left center",
              transform: `rotateY(${flipAngle}deg)`,
              transformStyle: "preserve-3d",
              zIndex: 10,
            }}
          >
            {/* Front face (right page) */}
            <div
              className="absolute inset-0 overflow-hidden rounded-r-lg"
              style={{ backfaceVisibility: "hidden" }}
            >
              <FlipbookPage page={flipFrontPage} />
              {/* Shine effect */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, rgba(0,0,0,${0.05 + Math.abs(flipAngle) / 180 * 0.15}) 0%, transparent 40%, rgba(255,255,255,${Math.abs(flipAngle) / 180 * 0.1}) 100%)`,
                }}
              />
              {/* Inner shadow along spine */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
            </div>

            {/* Back face (next page — mirrored) */}
            <div
              className="absolute inset-0 overflow-hidden rounded-l-lg"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {flipBackPage && <FlipbookPage page={flipBackPage} />}
              {/* Shadow effect on back */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(270deg, rgba(0,0,0,${0.1 - Math.abs(flipAngle) / 180 * 0.08}) 0%, transparent 50%)`,
                }}
              />
              {/* Inner shadow along spine */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Drop shadow under flipping page */}
        {(flipAngle !== 0 || isDragging) && (
          <div
            className="absolute top-2 w-1/2 h-[calc(100%-16px)] pointer-events-none"
            style={{
              left: "50%",
              transformOrigin: "left center",
              transform: `rotateY(${flipAngle * 0.7}deg)`,
              boxShadow: `0 0 ${Math.abs(flipAngle) / 3}px rgba(0,0,0,0.3)`,
              borderRadius: "0 8px 8px 0",
              zIndex: 9,
            }}
          />
        )}

        {/* Center spine line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/10 -translate-x-1/2 z-20 pointer-events-none" />
      </div>

      {/* Click zones for navigation (when not dragging) */}
      {!isDragging && !isFlipping && (
        <>
          {currentSpread > 0 && (
            <button
              onClick={flipBackward}
              className="absolute left-0 top-0 w-1/4 h-full z-30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
              aria-label="Página anterior"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent" />
            </button>
          )}
          {hasRight && rightPageIdx + 1 < pages.length && (
            <button
              onClick={flipForward}
              className="absolute right-0 top-0 w-1/4 h-full z-30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
              aria-label="Próxima página"
            >
              <div className="absolute inset-0 bg-gradient-to-l from-black/5 to-transparent" />
            </button>
          )}
        </>
      )}

      {/* Drag cursor hint — corner fold */}
      {!isFlipping && !isDragging && hasRight && rightPageIdx + 1 < pages.length && (
        <div
          className="absolute bottom-3 right-3 w-8 h-8 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={onMouseDown as any}
          style={{
            background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.06) 50%)",
            borderRadius: "0 0 4px 0",
          }}
        />
      )}
    </div>
  );
}
