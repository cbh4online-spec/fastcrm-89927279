import { useState, useEffect, useCallback, useRef } from "react";
import { FlipbookPage, FlipbookPageData } from "./FlipbookPage";
import { FlipbookToolbar } from "./FlipbookToolbar";
import { PageFlip } from "./PageFlip";

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
        pageNumber: 0,
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
  // currentSpread = index of left page (always even: 0, 2, 4, ...)
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pages = buildPages(title, subtitle, author, coverUrl, chapters);

  const goToSpread = useCallback((spread: number) => {
    // Ensure even
    const s = Math.max(0, Math.min(Math.floor(spread / 2) * 2, pages.length - 1));
    setCurrentSpread(s);
  }, [pages.length]);

  const goToPage = useCallback((page: number) => {
    // Convert page index to spread (even number)
    const spread = Math.floor(page / 2) * 2;
    goToSpread(spread);
  }, [goToSpread]);

  const flipForward = useCallback(() => {
    const nextSpread = currentSpread + 2;
    if (nextSpread < pages.length) {
      setCurrentSpread(nextSpread);
    }
  }, [currentSpread, pages.length]);

  const flipBackward = useCallback(() => {
    const prevSpread = currentSpread - 2;
    if (prevSpread >= 0) {
      setCurrentSpread(prevSpread);
    }
  }, [currentSpread]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipForward(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); flipBackward(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipForward, flipBackward]);

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

  // Compact mode: keep old single-page behavior
  if (compact) {
    const currentPage = currentSpread;
    const next = () => { if (currentPage < pages.length - 1) setCurrentSpread(currentPage + 1); };
    const prev = () => { if (currentPage > 0) setCurrentSpread(currentPage - 1); };

    return (
      <div className="flex flex-col">
        <div className="w-[360px] h-[480px] relative">
          <FlipbookPage page={pages[currentPage]} />
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-b-lg">
          <button onClick={prev} disabled={currentPage <= 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-[10px] tabular-nums text-muted-foreground">{currentPage + 1}/{pages.length}</span>
          <button onClick={next} disabled={currentPage >= pages.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
            Seguinte →
          </button>
        </div>
      </div>
    );
  }

  // Current display pages for toolbar
  const leftPage = currentSpread;
  const rightPage = Math.min(currentSpread + 1, pages.length - 1);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col group ${isFullscreen ? "bg-slate-950" : "bg-slate-900/95 rounded-xl overflow-hidden shadow-2xl"}`}
    >
      {/* Main viewer */}
      <div className={`flex-1 flex items-center justify-center ${isFullscreen ? "p-4" : "p-6 md:p-10"}`}>
        <div className="relative flex gap-1">
          {/* Thumbnails sidebar */}
          {showThumbnails && (
            <div className="w-24 mr-4 overflow-y-auto max-h-[780px] space-y-2 scrollbar-thin pr-1">
              {pages.map((p, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`w-full aspect-[3/4] rounded border-2 transition-all text-[6px] flex items-center justify-center overflow-hidden ${
                    (i === leftPage || i === rightPage)
                      ? "border-amber-400 shadow-lg shadow-amber-400/20 bg-white"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <span className={`font-mono ${(i === leftPage || i === rightPage) ? "text-slate-800" : "text-white/40"}`}>
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Page Flip Book */}
          <PageFlip
            pages={pages}
            currentSpread={currentSpread}
            onFlipForward={flipForward}
            onFlipBackward={flipBackward}
            pageHeight={pageHeight}
            pageWidth="w-full max-w-[580px]"
          />
        </div>
      </div>

      {/* Toolbar */}
      <FlipbookToolbar
        currentPage={currentSpread}
        totalPages={pages.length}
        onPrev={flipBackward}
        onNext={flipForward}
        onGoTo={goToPage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onToggleThumbnails={() => setShowThumbnails(s => !s)}
        showThumbnails={showThumbnails}
        spreadMode
        rightPage={rightPage}
      />
    </div>
  );
}
