import type { DragEvent } from "react";
import { Plus, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChapterThumbnail } from "../ChapterThumbnail";
import type { EbookChapter } from "@/hooks/useEbooks";

interface EbookChapterSidebarProps {
  chapters: EbookChapter[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onDuplicateChapter: (id: string) => void;
  onDeleteChapter: (id: string) => void;
  onMoveChapter: (id: string, dir: 'up' | 'down') => void;
  dragOverIndex: number | null;
  onDragStart: (e: DragEvent, index: number) => void;
  onDragOver: (e: DragEvent, index: number) => void;
  onDrop: (e: DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
}

export function EbookChapterSidebar({
  chapters, activeChapterId, onSelectChapter, onAddChapter,
  onDuplicateChapter, onDeleteChapter, onMoveChapter,
  dragOverIndex, onDragStart, onDragOver, onDrop, onDragLeave, onDragEnd,
}: EbookChapterSidebarProps) {
  return (
    <div className="w-[200px] shrink-0 border-r border-border/40 bg-muted/30 flex flex-col">
      <div className="p-2.5 border-b border-border/40 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Capítulos</span>
        <button onClick={onAddChapter} className="p-1 rounded hover:bg-accent transition-colors" title="Adicionar capítulo">
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chapters.map((ch, i) => (
            <ChapterThumbnail
              key={ch.id}
              chapter={ch}
              index={i}
              isActive={activeChapterId === ch.id}
              onClick={() => onSelectChapter(ch.id)}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              onDragEnd={onDragEnd}
              isDragOver={dragOverIndex === i}
              onDuplicate={() => onDuplicateChapter(ch.id)}
              onDelete={() => onDeleteChapter(ch.id)}
              onMoveUp={() => onMoveChapter(ch.id, 'up')}
              onMoveDown={() => onMoveChapter(ch.id, 'down')}
            />
          ))}
          {!chapters.length && (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Sem capítulos</p>
            </div>
          )}
          <button
            onClick={onAddChapter}
            className="w-full aspect-[3/2] rounded-lg border-2 border-dashed border-border/40 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
