import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize, Minimize, List, Printer, StickyNote, Highlighter, ZoomIn, ZoomOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlipbookToolbarProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleThumbnails: () => void;
  showThumbnails: boolean;
  spreadMode?: boolean;
  rightPage?: number;
  onPrint?: () => void;
  onToggleNotes?: () => void;
  showNotes?: boolean;
  notesCount?: number;
  highlightMode?: boolean;
  onToggleHighlightMode?: () => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  magnifyMode?: boolean;
  onToggleMagnify?: () => void;
}

export function FlipbookToolbar({
  currentPage, totalPages, onPrev, onNext, onGoTo,
  isFullscreen, onToggleFullscreen, onToggleThumbnails, showThumbnails,
  spreadMode, rightPage, onPrint, onToggleNotes, showNotes, notesCount,
  highlightMode, onToggleHighlightMode,
  zoomLevel = 1, onZoomIn, onZoomOut, onZoomReset,
  magnifyMode, onToggleMagnify,
}: FlipbookToolbarProps) {
  const [editingPage, setEditingPage] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLeft = currentPage + 1;
  const displayRight = spreadMode && rightPage !== undefined ? rightPage + 1 : displayLeft;
  const pageDisplay = spreadMode && displayLeft !== displayRight
    ? `${displayLeft}-${displayRight} / ${totalPages}`
    : `${displayLeft} / ${totalPages}`;

  const isAtStart = currentPage <= 0;
  const isAtEnd = spreadMode ? (currentPage + 2 >= totalPages) : (currentPage >= totalPages - 1);

  useEffect(() => {
    if (editingPage && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPage]);

  const handlePageSubmit = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      onGoTo(num - 1);
    }
    setEditingPage(false);
  };

  const btnClass = "h-8 w-8 text-white/60 hover:text-white hover:bg-white/10";
  const navBtnClass = "h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-t border-white/5">
      {/* Left group */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          onClick={onToggleThumbnails}
          title="Miniaturas"
          className={`${btnClass} ${showThumbnails ? "bg-white/10 text-white" : ""}`}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Center nav group */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost" size="icon"
          onClick={() => onGoTo(0)}
          disabled={isAtStart}
          title="Ir para o início"
          className={navBtnClass}
        >
          <ChevronsLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          onClick={onPrev}
          disabled={isAtStart}
          title="Página anterior"
          className={navBtnClass}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Page indicator / input */}
        {editingPage ? (
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePageSubmit(); if (e.key === "Escape") setEditingPage(false); }}
            onBlur={handlePageSubmit}
            className="w-16 h-8 text-center text-sm font-mono bg-white/10 border border-white/20 rounded text-white outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={() => { setInputValue(String(displayLeft)); setEditingPage(true); }}
            title="Clique para ir para uma página"
            className="text-sm text-white/80 tabular-nums min-w-[80px] text-center font-mono hover:bg-white/10 rounded px-2 py-1 transition-colors cursor-pointer"
          >
            {pageDisplay}
          </button>
        )}

        <Button
          variant="ghost" size="icon"
          onClick={onNext}
          disabled={isAtEnd}
          title="Página seguinte"
          className={navBtnClass}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          onClick={() => onGoTo(totalPages - 1)}
          disabled={isAtEnd}
          title="Ir para o final"
          className={navBtnClass}
        >
          <ChevronsRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Right group */}
      <div className="flex items-center gap-1">
        {/* Zoom controls */}
        {onZoomOut && (
          <Button
            variant="ghost" size="icon"
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.5}
            title="Reduzir zoom"
            className={btnClass}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        )}
        {onZoomReset && zoomLevel !== 1 && (
          <button
            onClick={onZoomReset}
            title="Repor zoom a 100%"
            className="text-[11px] font-mono text-white/60 hover:text-white hover:bg-white/10 rounded px-1.5 py-1 transition-colors cursor-pointer tabular-nums"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}
        {onZoomIn && (
          <Button
            variant="ghost" size="icon"
            onClick={onZoomIn}
            disabled={zoomLevel >= 2.5}
            title="Aumentar zoom"
            className={btnClass}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        )}
        {/* Magnify lens button */}
        {onToggleMagnify && (
          <Button
            variant="ghost" size="icon"
            onClick={onToggleMagnify}
            title={magnifyMode ? "Sair do modo lupa" : "Lupa de zoom"}
            className={`${btnClass} ${magnifyMode ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40" : ""}`}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        {/* Separator */}
        {onZoomIn && <div className="w-px h-5 bg-white/10 mx-0.5" />}
        {onToggleHighlightMode && (
          <Button
            variant="ghost" size="icon"
            onClick={onToggleHighlightMode}
            title={highlightMode ? "Sair do modo sublinhar" : "Sublinhar texto"}
            className={`${btnClass} ${highlightMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40" : ""}`}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        )}
        {onToggleNotes && (
          <Button
            variant="ghost" size="icon"
            onClick={onToggleNotes}
            title="Notas"
            className={`${btnClass} relative ${showNotes ? "bg-white/10 text-amber-400" : ""}`}
          >
            <StickyNote className="h-4 w-4" />
            {(notesCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-[9px] font-bold text-slate-900 flex items-center justify-center px-0.5">
                {notesCount}
              </span>
            )}
          </Button>
        )}
        {onPrint && (
          <Button
            variant="ghost" size="icon"
            onClick={onPrint}
            title="Imprimir eBook"
            className={btnClass}
          >
            <Printer className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost" size="icon"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
          className={btnClass}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
