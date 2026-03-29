import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { FlipbookPage, FlipbookPageData } from "./FlipbookPage";

// react-pageflip requires forwardRef pages
const PageWrapper = forwardRef<HTMLDivElement, { page: FlipbookPageData }>(
  ({ page }, ref) => (
    <div ref={ref} className="w-full h-full">
      <FlipbookPage page={page} />
    </div>
  )
);
PageWrapper.displayName = "PageWrapper";

export interface PageFlipHandle {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (page: number) => void;
}

interface PageFlipProps {
  pages: FlipbookPageData[];
  onFlip?: (pageIndex: number) => void;
  pageHeight: string;
  isFullscreen?: boolean;
}

function calcDimensions(isFullscreen: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (isFullscreen) {
    // Maximize within viewport, leave room for toolbar
    const availH = vh - 64;
    const w = Math.min(Math.floor(availH / 1.4), Math.floor(vw * 0.42));
    return { width: Math.max(w, 280), height: Math.floor(Math.max(w, 280) * 1.4), portrait: vw < 640 };
  }

  if (vw < 640) {
    // Mobile — portrait single page
    const w = Math.floor(vw * 0.88);
    return { width: Math.min(w, 420), height: Math.floor(Math.min(w, 420) * 1.4), portrait: true };
  }

  if (vw < 1024) {
    // Tablet
    const w = Math.min(Math.floor(vw * 0.38), 340);
    return { width: w, height: Math.floor(w * 1.4), portrait: false };
  }

  // Desktop
  const maxH = Math.min(vh - 120, 780);
  const w = Math.floor(maxH / 1.4);
  return { width: Math.min(w, 520), height: maxH, portrait: false };
}

export const PageFlipBook = forwardRef<PageFlipHandle, PageFlipProps>(
  ({ pages, onFlip, isFullscreen = false }, ref) => {
    const flipBookRef = useRef<any>(null);
    const [dims, setDims] = useState(() => calcDimensions(isFullscreen));

    useEffect(() => {
      const update = () => setDims(calcDimensions(isFullscreen));
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }, [isFullscreen]);

    useImperativeHandle(ref, () => ({
      flipNext: () => flipBookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => flipBookRef.current?.pageFlip()?.flipPrev(),
      turnToPage: (page: number) => flipBookRef.current?.pageFlip()?.turnToPage(page),
    }));

    const handleFlip = useCallback((e: any) => {
      onFlip?.(e.data);
    }, [onFlip]);

    return (
      <div className="flex items-center justify-center w-full" style={{ perspective: "2000px" }}>
        {/* @ts-ignore - react-pageflip types are incomplete */}
        <HTMLFlipBook
          key={`${dims.width}-${dims.height}-${dims.portrait}`}
          ref={flipBookRef}
          width={dims.width}
          height={dims.height}
          size="stretch"
          minWidth={240}
          maxWidth={600}
          minHeight={340}
          maxHeight={900}
          showCover={true}
          drawShadow={true}
          flippingTime={800}
          usePortrait={dims.portrait}
          startPage={0}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          onFlip={handleFlip}
          className="flipbook-container"
          style={{}}
        >
          {pages.map((page, i) => (
            <PageWrapper key={i} page={page} />
          ))}
        </HTMLFlipBook>
      </div>
    );
  }
);
PageFlipBook.displayName = "PageFlipBook";
