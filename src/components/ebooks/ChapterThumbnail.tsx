import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { EbookChapter } from '@/hooks/useEbooks';

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
}: ChapterThumbnailProps) {
  const hasContent = !!(chapter.content && chapter.content.trim().length > 0);
  const wordCount = chapter.content?.split(/\s+/).filter(Boolean).length || 0;

  // Get a mini preview of the content (first ~60 chars)
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
            <p className="text-[9px] font-bold text-foreground/80 leading-tight truncate">
              {chapter.title}
            </p>
            {preview && (
              <p className="text-[8px] text-muted-foreground leading-tight mt-0.5 line-clamp-3">
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
