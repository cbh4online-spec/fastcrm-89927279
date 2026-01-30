import { useRef } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  Type,
  Image,
  MousePointer,
  Minus,
  Square,
  Share2,
  FileText,
  Code,
  Columns,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { 
  EmailBlock, 
  EmailBlockType,
  EmailGlobalStyles,
  TextBlockContent,
  ImageBlockContent,
  ButtonBlockContent,
  DividerBlockContent,
  SpacerBlockContent,
  FooterBlockContent,
} from '@/types/emailBuilder';

interface EmailCanvasProps {
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  draggedBlockType: EmailBlockType | null;
  onDropNewBlock: (type: EmailBlockType, index: number) => void;
}

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  image: Image,
  button: MousePointer,
  divider: Minus,
  spacer: Square,
  columns: Columns,
  social: Share2,
  footer: FileText,
  logo: Image,
  video: Image,
  html: Code,
};

export function EmailCanvas({
  blocks,
  globalStyles,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onReorderBlocks,
  draggedBlockType,
  onDropNewBlock,
}: EmailCanvasProps) {
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItemRef.current = index;
  };

  const handleDragEnd = () => {
    if (dragItemRef.current !== null && dragOverItemRef.current !== null) {
      onReorderBlocks(dragItemRef.current, dragOverItemRef.current);
    }
    dragItemRef.current = null;
    dragOverItemRef.current = null;
  };

  const handleDropZoneDrop = (index: number) => {
    if (draggedBlockType) {
      onDropNewBlock(draggedBlockType, index);
    }
  };

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const renderBlockPreview = (block: EmailBlock) => {
    switch (block.type) {
      case 'text': {
        const content = block.content as TextBlockContent;
        return (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        );
      }
      case 'image':
      case 'logo': {
        const content = block.content as ImageBlockContent;
        return content.src ? (
          <img 
            src={content.src} 
            alt={content.alt} 
            className="max-w-full h-auto"
            style={{ maxWidth: block.styles.maxWidth }}
          />
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
            <Image className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">Clica para adicionar imagem</p>
          </div>
        );
      }
      case 'button': {
        const content = block.content as ButtonBlockContent;
        return (
          <button
            className="px-6 py-3 font-bold rounded-md"
            style={{
              backgroundColor: content.backgroundColor || '#3b82f6',
              color: content.textColor || '#ffffff',
              borderRadius: content.borderRadius || '6px',
            }}
          >
            {content.text}
          </button>
        );
      }
      case 'divider': {
        const content = block.content as DividerBlockContent;
        return (
          <hr 
            className="border-0"
            style={{
              borderTop: `${content.thickness || '1px'} ${content.style || 'solid'} ${content.color || '#e5e5e5'}`,
            }}
          />
        );
      }
      case 'spacer': {
        const content = block.content as SpacerBlockContent;
        return (
          <div 
            className="bg-muted/30"
            style={{ height: content.height }}
          />
        );
      }
      case 'social': {
        return (
          <div className="flex items-center justify-center gap-4">
            <span className="text-2xl">📘</span>
            <span className="text-2xl">📸</span>
            <span className="text-2xl">💼</span>
          </div>
        );
      }
      case 'footer': {
        const content = block.content as FooterBlockContent;
        return (
          <div className="text-center text-sm text-muted-foreground">
            <p>{content.text}</p>
            {content.showUnsubscribe && (
              <p className="mt-2">
                <a href="#" className="underline">Cancelar subscrição</a>
              </p>
            )}
          </div>
        );
      }
      default:
        return <p className="text-muted-foreground text-sm">Bloco não suportado</p>;
    }
  };

  const blockTypeNames: Record<string, string> = {
    text: 'Texto',
    image: 'Imagem',
    button: 'Botão',
    divider: 'Divisor',
    spacer: 'Espaçador',
    columns: 'Colunas',
    social: 'Redes Sociais',
    footer: 'Rodapé',
    logo: 'Logo',
    video: 'Vídeo',
    html: 'HTML',
  };

  return (
    <div 
      className="flex-1 overflow-auto p-8"
      style={{ backgroundColor: globalStyles.backgroundColor }}
    >
      <div 
        className="mx-auto rounded-lg shadow-sm overflow-hidden"
        style={{ 
          maxWidth: globalStyles.contentWidth,
          backgroundColor: globalStyles.contentBackgroundColor,
          fontFamily: globalStyles.fontFamily,
          color: globalStyles.textColor,
        }}
      >
        <div className="p-6">
          {blocks.length === 0 ? (
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                draggedBlockType ? "border-primary bg-primary/5" : "border-muted-foreground/30"
              )}
              onDragOver={handleDropZoneDragOver}
              onDrop={() => handleDropZoneDrop(0)}
            >
              <Type className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium mt-4">
                Começa a construir o teu email
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Arrasta elementos do painel lateral ou escolhe um layout
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Drop zone before first block */}
              {draggedBlockType && (
                <div
                  className="h-2 bg-primary/20 rounded transition-all hover:h-8 hover:bg-primary/30"
                  onDragOver={handleDropZoneDragOver}
                  onDrop={() => handleDropZoneDrop(0)}
                />
              )}
              
              {blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id;
                const BlockIcon = BLOCK_ICONS[block.type] || Type;
                
                return (
                  <div key={block.id}>
                    <div
                      className={cn(
                        "group relative rounded-lg border transition-all",
                        isSelected 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                      onClick={() => onSelectBlock(block.id)}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {/* Block toolbar */}
                      <div className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
                        "flex items-center gap-1 px-2 py-1 rounded-full bg-background border shadow-sm",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        isSelected && "opacity-100"
                      )}>
                        <div className="flex items-center gap-1 pr-2 border-r">
                          <BlockIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {blockTypeNames[block.type]}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveBlock(block.id, 'up');
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveBlock(block.id, 'down');
                          }}
                          disabled={index === blocks.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateBlock(block.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBlock(block.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="cursor-grab active:cursor-grabbing pl-1 border-l">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Block content */}
                      <div 
                        className="p-4"
                        style={{
                          textAlign: block.styles.textAlign as 'left' | 'center' | 'right' | undefined,
                          padding: block.styles.padding,
                          backgroundColor: block.styles.backgroundColor,
                        }}
                      >
                        {renderBlockPreview(block)}
                      </div>
                    </div>
                    
                    {/* Drop zone after each block */}
                    {draggedBlockType && (
                      <div
                        className="h-2 bg-primary/20 rounded transition-all hover:h-8 hover:bg-primary/30 mt-2"
                        onDragOver={handleDropZoneDragOver}
                        onDrop={() => handleDropZoneDrop(index + 1)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
