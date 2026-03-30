import { useRef, useCallback, memo, type DragEvent } from 'react';
import { GripVertical, Trash2, Copy, ArrowUp, ArrowDown, Type, ImageIcon, Quote, Minus, Table2, Columns2, List, MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentBlock, BlockStyles } from '@/hooks/useEbooks';

interface EbookVisualBlockProps {
  block: ContentBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: DragEvent, index: number) => void;
  onDragOver: (e: DragEvent, index: number) => void;
  onDrop: (e: DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  heading: Type,
  paragraph: Type,
  image: ImageIcon,
  quote: Quote,
  divider: Minus,
  list: List,
  cta: MousePointer,
  table: Table2,
  columns: Columns2,
  spacer: Minus,
};

const TYPE_LABELS: Record<string, string> = {
  heading: 'Título',
  paragraph: 'Texto',
  image: 'Imagem',
  quote: 'Citação',
  divider: 'Divisor',
  list: 'Lista',
  cta: 'CTA',
  table: 'Tabela',
  columns: 'Colunas',
  spacer: 'Espaço',
};

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  soft: '0 2px 8px rgba(0,0,0,0.08)',
  medium: '0 4px 16px rgba(0,0,0,0.12)',
  hard: '0 8px 32px rgba(0,0,0,0.18)',
};

function stylesToCss(styles: BlockStyles): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (styles.padding) css.padding = styles.padding;
  if (styles.paddingTop) css.paddingTop = styles.paddingTop;
  if (styles.paddingRight) css.paddingRight = styles.paddingRight;
  if (styles.paddingBottom) css.paddingBottom = styles.paddingBottom;
  if (styles.paddingLeft) css.paddingLeft = styles.paddingLeft;
  if (styles.margin) css.margin = styles.margin;
  if (styles.marginTop) css.marginTop = styles.marginTop;
  if (styles.marginRight) css.marginRight = styles.marginRight;
  if (styles.marginBottom) css.marginBottom = styles.marginBottom;
  if (styles.marginLeft) css.marginLeft = styles.marginLeft;
  if (styles.bgColor) css.backgroundColor = styles.bgColor;
  if (styles.textColor) css.color = styles.textColor;
  if (styles.fontSize) css.fontSize = styles.fontSize;
  if (styles.fontWeight) css.fontWeight = styles.fontWeight;
  if (styles.lineHeight) css.lineHeight = styles.lineHeight;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.borderWidth) css.borderWidth = styles.borderWidth;
  if (styles.borderColor) css.borderColor = styles.borderColor;
  if (styles.borderRadius) css.borderRadius = styles.borderRadius;
  if (styles.borderStyle) css.borderStyle = styles.borderStyle || 'solid';
  if (styles.shadow && styles.shadow !== 'none') css.boxShadow = SHADOW_MAP[styles.shadow] || 'none';
  if (styles.opacity) css.opacity = styles.opacity;
  if (styles.width) css.width = styles.width;
  if (styles.minHeight) css.minHeight = styles.minHeight;
  return css;
}

export { stylesToCss };

export const EbookVisualBlock = memo(function EbookVisualBlock({
  block,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: EbookVisualBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const Icon = TYPE_ICONS[block.type] || Type;

  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      onUpdate({ ...block, content: contentRef.current.innerHTML });
    }
  }, [block, onUpdate]);

  const renderContent = () => {
    const blockCss = stylesToCss(block.styles);

    switch (block.type) {
      case 'divider':
        return <hr className="border-border" style={blockCss} />;
      case 'spacer':
        return <div style={{ ...blockCss, minHeight: blockCss.minHeight || '32px' }} />;
      case 'image':
        return (
          <div style={blockCss}>
            {block.content ? (
              <img src={block.content} alt="" className="w-full rounded-md object-cover" style={{ borderRadius: blockCss.borderRadius }} />
            ) : (
              <div className="h-32 bg-muted/50 rounded-md flex items-center justify-center border border-dashed border-border">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
        );
      case 'columns':
        return (
          <div className="flex gap-3" style={{ ...blockCss, gap: block.styles.gap || '12px' }}>
            {(block.children || []).map((child, i) => (
              <div key={child.id} className="flex-1 min-h-[60px] border border-dashed border-border/40 rounded-md p-2">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none min-h-[40px] text-sm"
                  dangerouslySetInnerHTML={{ __html: child.content }}
                  onInput={(e) => {
                    const newChildren = [...(block.children || [])];
                    newChildren[i] = { ...newChildren[i], content: (e.target as HTMLDivElement).innerHTML };
                    onUpdate({ ...block, children: newChildren });
                  }}
                />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "outline-none min-h-[1.5em] cursor-text",
              block.type === 'heading' && "text-xl font-bold",
              block.type === 'quote' && "border-l-4 border-primary/30 pl-4 italic text-muted-foreground",
              block.type === 'cta' && "text-center",
            )}
            style={blockCss}
            dangerouslySetInnerHTML={{ __html: block.content }}
            onInput={handleContentChange}
            onClick={(e) => e.stopPropagation()}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg transition-all duration-150",
        "border-2 border-transparent",
        isSelected && "border-primary/50 ring-2 ring-primary/10",
        !isSelected && "hover:border-border/60",
        isDragOver && "border-primary/30 bg-primary/5",
      )}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index); }}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle + type badge */}
      <div className={cn(
        "absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-opacity",
        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <div className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-accent">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Floating toolbar */}
      {isSelected && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-md px-1 py-0.5 z-20">
          <span className="text-[10px] text-muted-foreground px-1.5 font-medium flex items-center gap-1">
            <Icon className="h-3 w-3" /> {TYPE_LABELS[block.type]}
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-accent rounded transition-colors" title="Mover acima">
            <ArrowUp className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-accent rounded transition-colors" title="Mover abaixo">
            <ArrowDown className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-accent rounded transition-colors" title="Duplicar">
            <Copy className="h-3 w-3" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive" title="Eliminar">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Block content */}
      <div className="p-2">
        {renderContent()}
      </div>
    </div>
  );
});
