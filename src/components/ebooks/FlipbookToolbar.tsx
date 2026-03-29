import { ChevronLeft, ChevronRight, Maximize, Minimize, List } from "lucide-react";
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
}

export function FlipbookToolbar({
  currentPage, totalPages, onPrev, onNext, onGoTo,
  isFullscreen, onToggleFullscreen, onToggleThumbnails, showThumbnails,
  spreadMode, rightPage,
}: FlipbookToolbarProps) {
  const displayLeft = currentPage + 1;
  const displayRight = spreadMode && rightPage !== undefined ? rightPage + 1 : displayLeft;
  const pageDisplay = spreadMode && displayLeft !== displayRight
    ? `${displayLeft}-${displayRight} / ${totalPages}`
    : `${displayLeft} / ${totalPages}`;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-t border-white/5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="icon"
          onClick={onToggleThumbnails}
          className={`h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 ${showThumbnails ? "bg-white/10 text-white" : ""}`}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost" size="icon"
          onClick={onPrev}
          disabled={currentPage <= 0}
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-white/80 tabular-nums min-w-[80px] text-center font-mono">
          {pageDisplay}
        </span>
        <Button
          variant="ghost" size="icon"
          onClick={onNext}
          disabled={spreadMode ? (currentPage + 2 >= totalPages) : (currentPage >= totalPages - 1)}
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="icon"
          onClick={onToggleFullscreen}
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
