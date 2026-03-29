import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { FlipbookPage, FlipbookPageData } from "./FlipbookPage";

// react-pageflip requires forwardRef pages
const PageWrapper = forwardRef<HTMLDivElement, { page: FlipbookPageData; pageWidth: number; pageHeight: number }>(
  ({ page, pageWidth, pageHeight }, ref) => (
    <div ref={ref} className="w-full h-full">
      <FlipbookPage page={page} pageWidth={pageWidth} pageHeight={pageHeight} />
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

// A4 ratio ≈ 1:1.414
const A4_RATIO = 1.414;

function calcDimensions(isFullscreen: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (isFullscreen) {
    const availH = vh - 56;
    // Each page = half the spread; height-driven
    const h = Math.floor(availH * 0.94);
    const w = Math.floor(h / A4_RATIO);
    // Ensure the spread (2 pages) fits width
    const maxW = Math.floor(vw * 0.48);
    const finalW = Math.min(w, maxW);
    const finalH = Math.floor(finalW * A4_RATIO);
    return { width: Math.max(finalW, 280), height: Math.max(finalH, 400), portrait: vw < 640 };
  }

  if (vw < 640) {
    // Mobile — single page portrait
    const w = Math.floor(vw * 0.92);
    const finalW = Math.min(w, 440);
    return { width: finalW, height: Math.floor(finalW * A4_RATIO), portrait: true };
  }

  if (vw < 1024) {
    // Tablet — each page takes ~45% of viewport width
    const w = Math.min(Math.floor(vw * 0.45), 440);
    return { width: w, height: Math.floor(w * A4_RATIO), portrait: false };
  }

  // Desktop — maximize height, derive width from A4 ratio
  const toolbarH = 64;
  const availH = vh - toolbarH;
  const h = Math.floor(availH * 0.88);
  const w = Math.floor(h / A4_RATIO);
  // Each page ≤ 49% of vw so the 2-page spread fits
  const maxW = Math.floor(vw * 0.49);
  const finalW = Math.min(w, maxW);
  const finalH = Math.floor(finalW * A4_RATIO);
  return { width: finalW, height: finalH, portrait: false };
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
          size="fixed"
          minWidth={280}
          maxWidth={1000}
          minHeight={400}
          maxHeight={1420}
          showCover={true}
          drawShadow={true}
          flippingTime={800}
          usePortrait={dims.portrait}
          startPage={0}
          startZIndex={0}
          autoSize={false}
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
            <PageWrapper key={i} page={page} pageWidth={dims.width} pageHeight={dims.height} />
          ))}
        </HTMLFlipBook>
      </div>
    );
  }
);
PageFlipBook.displayName = "PageFlipBook";
