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
  const wordCount = chapter.content?.split(/\s+/).filter(Boolean).length || 0;

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
          "relative rounded-lg border-2 overflow-hidden aspect-[4/3] transition-all duration-200",
          isActive
            ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/10"
            : "border-border/40 hover:border-primary/40 hover:shadow-md"
        )}
      >
        {/* Background with content preview */}
        <div className="absolute inset-0 bg-card p-2 flex flex-col">
          {chapter.cover_image ? (
            <div className="h-1/2 rounded overflow-hidden mb-1">
              <img src={chapter.cover_image} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-bold text-foreground/80 leading-tight truncate">
              {chapter.title}
            </p>
            {preview && (
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-3">
                {preview}
              </p>
            )}
          </div>
        </div>

        {/* Status icon */}
        <div className="absolute top-1 right-1">
          {hasContent
            ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            : <Circle className="h-3 w-3 text-amber-400" />
          }
        </div>

        {/* Drag handle */}
        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
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

      {/* Label */}
      <div className="mt-1 px-0.5">
        <p className={cn(
          "text-xs font-medium truncate",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {index + 1}. {chapter.title}
        </p>
        {hasContent && (
          <p className="text-[10px] text-muted-foreground tabular-nums">{wordCount}w</p>
        )}
      </div>
    </div>
  );
}
