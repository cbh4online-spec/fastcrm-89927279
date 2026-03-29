import { useState, useEffect, useCallback, useRef } from "react";
import { FlipbookPage, FlipbookPageData, ContactPageData } from "./FlipbookPage";
import { FlipbookToolbar } from "./FlipbookToolbar";
import { PageFlipBook, PageFlipHandle } from "./PageFlip";
import { EbookNotesPanel } from "./EbookNotesPanel";
import { FlipbookWatermark } from "./FlipbookWatermark";
import { FlipbookHighlightPopover } from "./FlipbookHighlightPopover";
import { AnimatedHandCursor } from "./AnimatedHandCursor";
import { useEbookNotes } from "@/hooks/useEbookNotes";
import { EbookReadTracker } from "./EbookReadTracker";

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
  headerText?: string;
  footerText?: string;
  contactPage?: ContactPageData;
  styleTokens?: Record<string, unknown>;
  ebookId?: string;
  workspaceId?: string;
  protectionEnabled?: boolean;
  watermarkText?: string;
  trackingViewId?: string;
}

function buildStyleVars(tokens?: Record<string, unknown>): React.CSSProperties {
  if (!tokens) return {};
  const vars: Record<string, string> = {};
  if (tokens.primaryColor) vars["--ebook-primary"] = String(tokens.primaryColor);
  if (tokens.secondaryColor) vars["--ebook-secondary"] = String(tokens.secondaryColor);
  if (tokens.accentColor) vars["--ebook-accent"] = String(tokens.accentColor);
  if (tokens.backgroundColor) vars["--ebook-bg"] = String(tokens.backgroundColor);
  if (tokens.headingFont) vars["--ebook-heading-font"] = String(tokens.headingFont);
  if (tokens.bodyFont) vars["--ebook-body-font"] = String(tokens.bodyFont);
  return vars as React.CSSProperties;
}

const CHARS_PER_PAGE = 800;
const IMAGE_CHAR_EQUIVALENT = 600;

function isHtmlContent(content: string): boolean {
  return /<(p|h[1-6]|div|ul|ol|blockquote|table|figure|img|br|hr)\b/i.test(content);
}

function splitHtmlIntoPages(html: string): string[] {
  // Split HTML by block-level tags, keeping tags intact
  const blockRegex = /(<(?:p|h[1-6]|div|ul|ol|li|blockquote|table|figure|hr|br|img)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|div|ul|ol|li|blockquote|table|figure)>|<(?:hr|br|img)[^>]*\/?>)/gi;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = blockRegex.exec(html)) !== null) {
    blocks.push(match[0]);
  }
  
  // If regex didn't find blocks, the HTML might be simple text with tags
  if (blocks.length === 0) {
    // Try splitting by common separators
    const fallbackBlocks = html.split(/<br\s*\/?>\s*<br\s*\/?>/gi).filter(b => b.trim());
    if (fallbackBlocks.length > 0) {
      blocks.push(...fallbackBlocks.map(b => `<p>${b}</p>`));
    } else {
      return [html];
    }
  }

  const pages: string[] = [];
  let current = "";
  let currentWeight = 0;

  for (const block of blocks) {
    const isImage = /<img\b/i.test(block);
    const textContent = block.replace(/<[^>]+>/g, "");
    const blockWeight = isImage ? IMAGE_CHAR_EQUIVALENT : textContent.length;
    const combinedWeight = currentWeight + blockWeight;

    if (combinedWeight > CHARS_PER_PAGE && current.length > 0) {
      if (combinedWeight <= CHARS_PER_PAGE * 1.1) {
        current += block;
        currentWeight = combinedWeight;
      } else {
        pages.push(current);
        current = block;
        currentWeight = blockWeight;
      }
    } else {
      current += block;
      currentWeight = combinedWeight;
    }
  }
  if (current.trim()) pages.push(current);
  return pages.length ? pages : ["<p><em>Conteúdo em preparação</em></p>"];
}

function splitMarkdownIntoPages(content: string): string[] {
  const paragraphs = content.split(/\n\n+/);
  const pages: string[] = [];
  let current = "";
  let currentWeight = 0;

  for (const para of paragraphs) {
    const isImage = /!\[.*?\]\(.*?\)/.test(para);
    const paraWeight = isImage ? IMAGE_CHAR_EQUIVALENT : para.length;
    const combinedWeight = currentWeight + (current ? 2 : 0) + paraWeight;

    if (combinedWeight > CHARS_PER_PAGE && current.length > 0) {
      if (combinedWeight <= CHARS_PER_PAGE * 1.1) {
        current += (current ? "\n\n" : "") + para;
        currentWeight = combinedWeight;
      } else {
        pages.push(current.trim());
        current = para;
        currentWeight = paraWeight;
      }
    } else {
      current += (current ? "\n\n" : "") + para;
      currentWeight = combinedWeight;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages.length ? pages : ["*Conteúdo em preparação*"];
}

function splitContentIntoPages(content: string): string[] {
  if (!content || content.trim().length === 0) return ["<p><em>Conteúdo em preparação</em></p>"];
  return isHtmlContent(content) ? splitHtmlIntoPages(content) : splitMarkdownIntoPages(content);
}

function buildPages(
  title: string,
  subtitle?: string,
  author?: string,
  coverUrl?: string,
  chapters: EbookChapter[] = [],
  headerText?: string,
  footerText?: string,
  contactPage?: ContactPageData
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
        headerText,
        footerText,
      });
      pageOffset++;
    }
  }

  // TOC
  if (chapters.length > 0) {
    pages.push({ type: "toc", chapters: tocEntries });
  }

  // Add chapter pages and set page numbers
  const hasContact = contactPage && (contactPage.email || contactPage.phone || contactPage.website || contactPage.slogan);
  const totalPages = pages.length + chapterPages.length + (hasContact ? 1 : 0);
  for (const p of chapterPages) {
    if (p.type === "content") {
      p.pageNumber = pages.length + 1;
      p.totalPages = totalPages;
    }
    pages.push(p);
  }

  // Contact page at the end
  if (hasContact) {
    pages.push({ type: "contact", contactData: contactPage!, title });
  }

  return pages;
}

function CompactReader({ pages }: { pages: FlipbookPageData[] }) {
  const [compactPage, setCompactPage] = useState(0);
  const next = () => { if (compactPage < pages.length - 1) setCompactPage(compactPage + 1); };
  const prev = () => { if (compactPage > 0) setCompactPage(compactPage - 1); };

  return (
    <div className="flex flex-col">
      <div className="w-[360px] h-[480px] relative">
        <FlipbookPage page={pages[compactPage]} />
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-b-lg">
        <button onClick={prev} disabled={compactPage <= 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
          ← Anterior
        </button>
        <span className="text-[10px] tabular-nums text-muted-foreground">{compactPage + 1}/{pages.length}</span>
        <button onClick={next} disabled={compactPage >= pages.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
          Seguinte →
        </button>
      </div>
    </div>
  );
}

export function FlipbookReader({ title, subtitle, author, coverUrl, chapters, compact, headerText, footerText, contactPage, styleTokens, ebookId, workspaceId, protectionEnabled, watermarkText, trackingViewId }: FlipbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightPopover, setHighlightPopover] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<PageFlipHandle>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);

  const pages = buildPages(title, subtitle, author, coverUrl, chapters, headerText, footerText, contactPage);

  const { notes, addNote, deleteNote, pagesWithNotes } = useEbookNotes(ebookId, workspaceId);
  const hasNotesFeature = !!ebookId && !!workspaceId;

  // Text selection handler for highlights
  const handleMouseUp = useCallback(() => {
    if (!hasNotesFeature) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) return;

    const range = selection?.getRangeAt(0);
    if (!range) return;
    const rect = range.getBoundingClientRect();
    const containerRect = bookContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setHighlightPopover({
      text,
      position: {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.bottom - containerRect.top,
      },
    });
  }, [hasNotesFeature]);

  const handleCreateHighlight = useCallback(
    (params: { highlightText: string; highlightColor: string; noteText: string }) => {
      addNote.mutate({
        pageNumber: currentPage,
        noteText: params.noteText || `Sublinhado: "${params.highlightText.substring(0, 80)}${params.highlightText.length > 80 ? "…" : ""}"`,
        noteType: "highlight",
        highlightText: params.highlightText,
        highlightColor: params.highlightColor,
      });
      window.getSelection()?.removeAllRanges();
      setHighlightPopover(null);
      setHighlightMode(false);
      setShowNotes(true);
    },
    [addNote, currentPage]
  );

  const handleFlip = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

  const goToPage = useCallback((page: number) => {
    flipBookRef.current?.turnToPage(page);
  }, []);

  const flipNext = useCallback(() => {
    flipBookRef.current?.flipNext();
  }, []);

  const flipPrev = useCallback(() => {
    flipBookRef.current?.flipPrev();
  }, []);

  // Zoom handlers
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.25;
  const handleZoomIn = useCallback(() => setZoomLevel(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoomLevel(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleZoomReset = useCallback(() => setZoomLevel(1), []);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); flipPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipNext, flipPrev]);

  // Ctrl+wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [handleZoomIn, handleZoomOut]);

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

  // Anti-print CSS injection for protected public ebooks
  useEffect(() => {
    if (!protectionEnabled) return;
    const style = document.createElement("style");
    style.id = "ebook-print-protection";
    style.textContent = `@media print { .ebook-protected-container, .ebook-protected-container * { display: none !important; visibility: hidden !important; } }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [protectionEnabled]);

  // Anti-keyboard shortcuts (PrintScreen, Ctrl+P) for protected ebooks
  useEffect(() => {
    if (!protectionEnabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") { e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [protectionEnabled]);

  if (compact) {
    return <CompactReader pages={pages} />;
  }

  // Determine spread display for toolbar
  const rightPage = Math.min(currentPage + 1, pages.length - 1);

  const pageHeight = isFullscreen ? "h-[calc(100vh-48px)]" : "h-[85vh] max-h-[780px]";

  // Protection event handlers
  const protectionHandlers = protectionEnabled ? {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  } : {};


  return (
    <div
      ref={containerRef}
      className={`flex flex-col group ${protectionEnabled ? "ebook-protected-container" : ""} ${isFullscreen ? "bg-slate-950 h-screen" : "bg-slate-900/95 rounded-xl overflow-hidden shadow-2xl h-[92vh]"}`}
      style={{
        ...buildStyleVars(styleTokens),
        ...(protectionEnabled && !highlightMode ? { userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties : {}),
        ...(highlightMode ? { userSelect: "text", WebkitUserSelect: "text" } as React.CSSProperties : {}),
      }}
      {...protectionHandlers}
    >
      {/* Main viewer */}
      <div className={`flex-1 flex overflow-hidden ${isFullscreen ? "p-2" : "p-4"}`}>
        <div className={`flex-1 flex items-center justify-center ${zoomLevel > 1 ? "overflow-auto" : "overflow-hidden"}`}>
          <div
            className="relative flex gap-1"
            ref={bookContainerRef}
            style={{
              cursor: highlightMode ? 'text' : 'none',
              transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
            onMouseUp={handleMouseUp}
          >
            {/* Animated hand cursor — hidden in highlight mode */}
            {!highlightMode && <AnimatedHandCursor containerRef={bookContainerRef} />}
            {/* Watermark overlay */}
            {protectionEnabled && (
              <FlipbookWatermark text={watermarkText} />
            )}

            {/* Highlight popover */}
            {highlightPopover && (
              <FlipbookHighlightPopover
                selectedText={highlightPopover.text}
                position={highlightPopover.position}
                onHighlight={handleCreateHighlight}
                onClose={() => {
                  setHighlightPopover(null);
                  window.getSelection()?.removeAllRanges();
                }}
              />
            )}

            {showThumbnails && (
              <div className="w-24 mr-4 overflow-y-auto max-h-[780px] space-y-2 scrollbar-thin pr-1">
                {pages.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`relative w-full aspect-[3/4] rounded border-2 transition-all text-[6px] flex items-center justify-center overflow-hidden ${
                      i === currentPage || i === rightPage
                        ? "shadow-lg bg-white"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                    style={i === currentPage || i === rightPage ? { borderColor: 'var(--ebook-accent, #d4a574)', boxShadow: `0 10px 15px -3px color-mix(in srgb, var(--ebook-accent, #d4a574) 20%, transparent)` } : undefined}
                  >
                    <span className={`font-mono ${i === currentPage || i === rightPage ? "text-slate-800" : "text-white/40"}`}>
                      {i + 1}
                    </span>
                    {pagesWithNotes.has(i) && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Page Flip Book */}
            <PageFlipBook
              ref={flipBookRef}
              pages={pages}
              onFlip={handleFlip}
              pageHeight={pageHeight}
              isFullscreen={isFullscreen}
              onGoToPage={goToPage}
              highlightMode={highlightMode}
            />
          </div>
        </div>

        {/* Notes Panel */}
        {hasNotesFeature && showNotes && (
          <EbookNotesPanel
            notes={notes}
            currentPage={currentPage}
            totalPages={pages.length}
            onAddNote={(params) => addNote.mutate(params)}
            onDeleteNote={(id) => deleteNote.mutate(id)}
            onGoToPage={goToPage}
            onClose={() => setShowNotes(false)}
            isAdding={addNote.isPending}
          />
        )}


        {/* Read tracking */}
        {trackingViewId && ebookId && workspaceId && (
          <EbookReadTracker
            ebookId={ebookId}
            workspaceId={workspaceId}
            viewId={trackingViewId}
            currentPage={currentPage}
            totalPages={pages.length}
          />
        )}
      </div>

      {/* Toolbar */}
      <FlipbookToolbar
        currentPage={currentPage}
        totalPages={pages.length}
        onPrev={flipPrev}
        onNext={flipNext}
        onGoTo={goToPage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onToggleThumbnails={() => setShowThumbnails(s => !s)}
        showThumbnails={showThumbnails}
        spreadMode
        rightPage={rightPage}
        onPrint={protectionEnabled ? undefined : () => window.print()}
        onToggleNotes={hasNotesFeature ? () => setShowNotes(s => !s) : undefined}
        showNotes={showNotes}
        notesCount={notes.length}
        highlightMode={highlightMode}
        onToggleHighlightMode={hasNotesFeature ? () => setHighlightMode(m => !m) : undefined}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />
    </div>
  );
}
