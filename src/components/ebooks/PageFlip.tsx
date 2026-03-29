import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
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

export const PageFlipBook = forwardRef<PageFlipHandle, PageFlipProps>(
  ({ pages, onFlip, isFullscreen }, ref) => {
    const flipBookRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flipNext: () => flipBookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => flipBookRef.current?.pageFlip()?.flipPrev(),
      turnToPage: (page: number) => flipBookRef.current?.pageFlip()?.turnToPage(page),
    }));

    const handleFlip = useCallback((e: any) => {
      onFlip?.(e.data);
    }, [onFlip]);

    // Determine dimensions based on fullscreen
    const width = isFullscreen ? 520 : 460;
    const height = isFullscreen ? 720 : 640;

    return (
      <div className="flex items-center justify-center" style={{ perspective: "2000px" }}>
        {/* @ts-ignore - react-pageflip types are incomplete */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={width}
          height={height}
          size="stretch"
          minWidth={300}
          maxWidth={600}
          minHeight={420}
          maxHeight={800}
          showCover={true}
          drawShadow={true}
          flippingTime={800}
          usePortrait={false}
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
