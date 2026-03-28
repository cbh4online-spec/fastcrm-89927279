import { useState, useEffect, useCallback, useRef } from "react";
import { FlipbookPage, FlipbookPageData } from "./FlipbookPage";
import { FlipbookToolbar } from "./FlipbookToolbar";
import { motion, AnimatePresence } from "framer-motion";

interface EbookChapter {
  id: string;
  title: string;
  content: string;
  cover_image?: string;
}

interface FlipbookReaderProps {
  title: string;
  subtitle?: string;
  author?: string;
  coverUrl?: string;
  chapters: EbookChapter[];
  compact?: boolean;
}

const CHARS_PER_PAGE = 1800;

function splitContentIntoPages(content: string): string[] {
  if (!content || content.trim().length === 0) return ["*Conteúdo em preparação*"];
  const paragraphs = content.split(/\n\n+/);
  const pages: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > CHARS_PER_PAGE && current.length > 0) {
      pages.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages.length ? pages : ["*Conteúdo em preparação*"];
}

function buildPages(
  title: string, subtitle?: string, author?: string, coverUrl?: string, chapters: EbookChapter[] = []
): FlipbookPageData[] {
  const pages: FlipbookPageData[] = [];

  // Cover
  pages.push({ type: "cover", title, subtitle, author, coverUrl });

  // Build chapter pages first to know page numbers for TOC
  const chapterPages: FlipbookPageData[] = [];
  const tocEntries: { title: string; pageStart: number }[] = [];

  let pageOffset = 2; // cover + toc
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    tocEntries.push({ title: ch.title, pageStart: pageOffset + 1 });

    // Chapter title page
    chapterPages.push({ type: "chapter-title", chapterIndex: i, title: ch.title, coverImage: ch.cover_image });
    pageOffset++;

    // Content pages
    const contentPages = splitContentIntoPages(ch.content);
    for (const content of contentPages) {
      chapterPages.push({
        type: "content",
        chapterIndex: i,
        chapterTitle: ch.title,
        content,
        pageNumber: 0, // will be set below
        totalPages: 0,
      });
      pageOffset++;
    }
  }

  // TOC
  if (chapters.length > 0) {
    pages.push({ type: "toc", chapters: tocEntries });
  }

  // Add chapter pages and set page numbers
  const totalPages = pages.length + chapterPages.length;
  for (const p of chapterPages) {
    if (p.type === "content") {
      p.pageNumber = pages.length + 1;
      p.totalPages = totalPages;
    }
    pages.push(p);
  }

  return pages;
}

export function FlipbookReader({ title, subtitle, author, coverUrl, chapters, compact }: FlipbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const pages = buildPages(title, subtitle, author, coverUrl, chapters);

  const goTo = useCallback((page: number) => {
    if (page < 0 || page >= pages.length) return;
    setDirection(page > currentPage ? 1 : -1);
    setCurrentPage(page);
  }, [currentPage, pages.length]);

  const next = useCallback(() => goTo(currentPage + 1), [currentPage, goTo]);
  const prev = useCallback(() => goTo(currentPage - 1), [currentPage, goTo]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
  };

  // Click on left/right edges only (narrower zones to avoid interfering with reading)
  const onPageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edgeWidth = 40; // px
    if (x < edgeWidth) prev();
    else if (x > rect.width - edgeWidth) next();
  };

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const pageHeight = compact ? "h-[480px]" : isFullscreen ? "h-[calc(100vh-48px)]" : "h-[85vh] max-h-[780px]";
  const pageWidth = compact ? "w-[360px]" : "w-full max-w-[580px]";

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0, rotateY: d > 0 ? -15 : 15 }),
    center: { x: 0, opacity: 1, rotateY: 0 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0, rotateY: d > 0 ? 15 : -15 }),
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? "bg-slate-950" : compact ? "" : "bg-slate-900/95 rounded-xl overflow-hidden shadow-2xl"}`}
    >
      {/* Main viewer */}
      <div className={`flex-1 flex items-center justify-center ${isFullscreen ? "p-4" : compact ? "p-0" : "p-6 md:p-10"}`}>
        <div className="relative flex gap-1">
          {/* Thumbnails sidebar */}
          {showThumbnails && !compact && (
            <div className="w-24 mr-4 overflow-y-auto max-h-[780px] space-y-2 scrollbar-thin pr-1">
              {pages.map((p, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-full aspect-[3/4] rounded border-2 transition-all text-[6px] flex items-center justify-center overflow-hidden ${
                    i === currentPage
                      ? "border-amber-400 shadow-lg shadow-amber-400/20 bg-white"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <span className={`font-mono ${i === currentPage ? "text-slate-800" : "text-white/40"}`}>
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Page */}
          <div
            className={`${pageWidth} ${pageHeight} relative overflow-hidden cursor-pointer select-none`}
            style={{ perspective: "1200px" }}
            onClick={onPageClick}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Book shadow */}
            <div className="absolute inset-0 rounded-lg shadow-[0_0_60px_rgba(0,0,0,0.4)] pointer-events-none z-10" />

            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentPage}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 rounded-lg overflow-hidden"
              >
                <FlipbookPage page={pages[currentPage]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {!compact && (
        <FlipbookToolbar
          currentPage={currentPage}
          totalPages={pages.length}
          onPrev={prev}
          onNext={next}
          onGoTo={goTo}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onToggleThumbnails={() => setShowThumbnails(s => !s)}
          showThumbnails={showThumbnails}
        />
      )}

      {/* Compact nav */}
      {compact && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-b-lg">
          <button onClick={prev} disabled={currentPage <= 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-[10px] tabular-nums text-muted-foreground">{currentPage + 1}/{pages.length}</span>
          <button onClick={next} disabled={currentPage >= pages.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
            Seguinte →
          </button>
        </div>
      )}
    </div>
  );
}
