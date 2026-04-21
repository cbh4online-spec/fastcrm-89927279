import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PitchSlideCanvas } from './PitchSlideCanvas';
import type { PitchSlideMeta } from './slides';
import type { PitchTokens } from '@/lib/pitch/tokens';

interface Props {
  slides: PitchSlideMeta[];
  currentIndex: number;
  total: number;
  tokens: PitchTokens;
  onSelect: (index: number) => void;
  onReorder: (newOrderIds: string[]) => void;
}

export function PitchSlideThumbnails({
  slides,
  currentIndex,
  total,
  tokens,
  onSelect,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = slides.findIndex((s) => s.id === active.id);
    const newIdx = slides.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(slides, oldIdx, newIdx);
    onReorder(next.map((s) => s.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 p-3">
          {slides.map((s, i) => (
            <SortableThumb
              key={s.id}
              slide={s}
              index={i}
              total={total}
              tokens={tokens}
              active={i === currentIndex}
              onSelect={() => onSelect(i)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface ThumbProps {
  slide: PitchSlideMeta;
  index: number;
  total: number;
  tokens: PitchTokens;
  active: boolean;
  onSelect: () => void;
}

function SortableThumb({ slide, index, total, tokens, active, onSelect }: ThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex-shrink-0 w-32 rounded-md border-2 overflow-hidden transition bg-card',
        active ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 p-0.5 rounded bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
        aria-label={`Arrastar slide ${index + 1}`}
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Number badge */}
      <div className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded bg-background/80 backdrop-blur text-[9px] font-mono tabular-nums text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </div>

      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="bg-white" style={{ aspectRatio: '16 / 9' }}>
          <PitchSlideCanvas>
            <slide.component tokens={tokens} pageNumber={index + 1} total={total} />
          </PitchSlideCanvas>
        </div>
        <div className="text-[10px] text-center py-1 bg-card text-muted-foreground truncate px-1">
          {index + 1}. {slide.title}
        </div>
      </button>
    </div>
  );
}
