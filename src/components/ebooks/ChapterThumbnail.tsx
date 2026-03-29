import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, GripVertical, MoreVertical, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { EbookChapter } from '@/hooks/useEbooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ChapterThumbnailProps {
  chapter: EbookChapter;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragLeave?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ChapterThumbnail({
  chapter,
  index,
  isActive,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  onDragEnd,
  isDragOver,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ChapterThumbnailProps) {
  const hasContent = !!(chapter.content && chapter.content.trim().length > 0);
  const preview = chapter.content
    ? chapter.content.replace(/<[^>]*>/g, '').replace(/[#*_\[\]()]/g, '').slice(0, 60)
    : '';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer transition-all duration-200",
        isDragOver && "opacity-50"
      )}
    >
      {/* Thumbnail card */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden transition-all duration-200",
          "border-2",
          isActive
            ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/10"
            : hasContent
              ? "border-emerald-500/30 hover:border-primary/40 hover:shadow-md"
              : "border-amber-400/30 hover:border-primary/40 hover:shadow-md"
        )}
      >
        {/* Content area */}
        <div className="bg-card p-2.5 min-h-[56px] flex gap-2.5 items-start">
          {/* Large chapter number */}
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-sm font-bold",
            isActive
              ? "bg-primary text-primary-foreground"
              : hasContent
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
          )}>
            {index + 1}
          </div>

          {/* Title + preview */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className={cn(
              "text-xs font-semibold leading-tight truncate",
              isActive ? "text-primary" : "text-foreground/80"
            )}>
              {chapter.title}
            </p>
            {preview ? (
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                {preview}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">Vazio</p>
            )}
          </div>
        </div>

        {/* Status dot */}
        <div className="absolute top-1.5 right-1.5">
          {hasContent
            ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            : <Circle className="h-3 w-3 text-amber-400" />
          }
        </div>

        {/* Drag handle */}
        <div className="absolute top-1.5 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Action menu */}
        {(onDuplicate || onDelete || onMoveUp || onMoveDown) && (
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 bg-background/80 hover:bg-background shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" collisionPadding={8}>
                {onMoveUp && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
                    <ArrowUp className="h-3.5 w-3.5 mr-2" /> Mover acima
                  </DropdownMenuItem>
                )}
                {onMoveDown && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
                    <ArrowDown className="h-3.5 w-3.5 mr-2" /> Mover abaixo
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                  </DropdownMenuItem>
                )}
                {(onDelete && (onDuplicate || onMoveUp || onMoveDown)) && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
