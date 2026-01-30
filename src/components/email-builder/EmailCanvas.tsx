import { useRef, useState } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  Plus,
  Type,
  Image,
  MousePointer,
  Minus,
  Square,
  Share2,
  FileText,
  Code,
  Columns,
  Sparkles,
  LayoutPanelLeft,
  ShoppingBag,
  Quote,
  Clock,
  Menu,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  HeroBlockPreview,
  ImageTextBlockPreview,
  ProductBlockPreview,
  TestimonialBlockPreview,
  CountdownBlockPreview,
  MenuBlockPreview,
} from './blocks';
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
  SocialBlockContent,
  HeroBlockContent,
  ImageTextBlockContent,
  ProductBlockContent,
  TestimonialBlockContent,
  CountdownBlockContent,
  MenuBlockContent,
  VideoBlockContent,
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
  onUpdateBlock?: (blockId: string, updates: Partial<EmailBlock>) => void;
  onOpenImageUploader?: (blockId: string) => void;
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
  video: Play,
  html: Code,
  hero: Sparkles,
  imageText: LayoutPanelLeft,
  product: ShoppingBag,
  testimonial: Quote,
  countdown: Clock,
  menu: Menu,
};

const BLOCK_NAMES: Record<string, string> = {
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
  hero: 'Hero',
  imageText: 'Imagem + Texto',
  product: 'Produto',
  testimonial: 'Testemunho',
  countdown: 'Countdown',
  menu: 'Menu',
};

const SOCIAL_ICONS: Record<string, string> = {
  facebook: '📘',
  twitter: '𝕏',
  instagram: '📸',
  linkedin: '💼',
  youtube: '▶️',
  tiktok: '🎵',
  whatsapp: '💬',
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
  onUpdateBlock,
  onOpenImageUploader,
}: EmailCanvasProps) {
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<number | null>(null);

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
    setHoveredDropZone(null);
  };

  const handleDropZoneDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setHoveredDropZone(index);
  };

  const handleDropZoneDragLeave = () => {
    setHoveredDropZone(null);
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
            className="max-w-full h-auto rounded cursor-pointer"
            style={{ maxWidth: block.styles.maxWidth }}
            onClick={() => onOpenImageUploader?.(block.id)}
          />
        ) : (
          <div 
            className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => onOpenImageUploader?.(block.id)}
          >
            <Image className="h-10 w-10 mx-auto text-primary/40" />
            <p className="text-sm text-muted-foreground mt-2">Clica para adicionar imagem</p>
          </div>
        );
      }
      case 'button': {
        const content = block.content as ButtonBlockContent;
        const sizeClasses = {
          small: 'px-4 py-2 text-sm',
          medium: 'px-6 py-3',
          large: 'px-8 py-4 text-lg',
        };
        return (
          <button
            className={cn(
              "font-semibold rounded-lg transition-transform hover:scale-105",
              sizeClasses[content.size || 'medium'],
              content.fullWidth && 'w-full'
            )}
            style={{
              backgroundColor: content.backgroundColor || '#3b82f6',
              color: content.textColor || '#ffffff',
              borderRadius: content.borderRadius || '8px',
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
            className="border-0 my-2"
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
            className="bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground"
            style={{ height: content.height }}
          >
            {content.height}
          </div>
        );
      }
      case 'social': {
        const content = block.content as SocialBlockContent;
        return (
          <div className="flex items-center justify-center gap-3">
            {content.networks.map((network, index) => (
              <a
                key={index}
                href="#"
                className={cn(
                  "flex items-center justify-center transition-transform hover:scale-110",
                  content.iconStyle === 'circle' && 'rounded-full bg-muted p-2',
                  content.iconStyle === 'square' && 'rounded bg-muted p-2',
                  content.iconStyle === 'rounded' && 'rounded-lg bg-muted p-2'
                )}
                style={{ fontSize: content.iconSize || '24px' }}
              >
                {SOCIAL_ICONS[network.type] || '🔗'}
              </a>
            ))}
          </div>
        );
      }
      case 'footer': {
        const content = block.content as FooterBlockContent;
        return (
          <div className="text-center">
            <p className="text-sm">{content.text}</p>
            {content.companyInfo && (
              <p className="text-sm mt-1 opacity-70">{content.companyInfo}</p>
            )}
            {content.showUnsubscribe && (
              <p className="mt-3">
                <a href="#" className="text-sm underline opacity-70 hover:opacity-100">
                  Cancelar subscrição
                </a>
              </p>
            )}
          </div>
        );
      }
      case 'video': {
        const content = block.content as VideoBlockContent;
        return content.thumbnailUrl ? (
          <div className="relative group cursor-pointer">
            <img 
              src={content.thumbnailUrl} 
              alt="Video thumbnail"
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center bg-black/50 group-hover:bg-black/70 transition-colors"
                style={{ color: content.playButtonColor || '#ffffff' }}
              >
                <Play className="h-8 w-8 fill-current" />
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
            <Play className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">Adicionar vídeo</p>
          </div>
        );
      }
      case 'hero':
        return <HeroBlockPreview content={block.content as HeroBlockContent} isEditing />;
      case 'imageText':
        return <ImageTextBlockPreview content={block.content as ImageTextBlockContent} isEditing />;
      case 'product':
        return <ProductBlockPreview content={block.content as ProductBlockContent} isEditing />;
      case 'testimonial':
        return <TestimonialBlockPreview content={block.content as TestimonialBlockContent} />;
      case 'countdown':
        return <CountdownBlockPreview content={block.content as CountdownBlockContent} />;
      case 'menu':
        return <MenuBlockPreview content={block.content as MenuBlockContent} isEditing />;
      default:
        return <p className="text-muted-foreground text-sm italic">Bloco não suportado</p>;
    }
  };

  const DropZone = ({ index, isFirst }: { index: number; isFirst?: boolean }) => (
    <div
      className={cn(
        "transition-all duration-200",
        draggedBlockType ? "py-1" : "py-0",
        hoveredDropZone === index ? "py-3" : ""
      )}
      onDragOver={(e) => handleDropZoneDragOver(e, index)}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={() => handleDropZoneDrop(index)}
    >
      <div
        className={cn(
          "h-1 rounded-full transition-all duration-200 mx-4",
          draggedBlockType ? "bg-primary/20" : "bg-transparent",
          hoveredDropZone === index && "h-2 bg-primary/40"
        )}
      />
    </div>
  );

  return (
    <div 
      className="flex-1 overflow-auto p-6"
      style={{ backgroundColor: globalStyles.backgroundColor }}
      onClick={() => onSelectBlock(null)}
    >
      <div 
        className="mx-auto rounded-lg shadow-lg overflow-hidden transition-all duration-300"
        style={{ 
          maxWidth: globalStyles.contentWidth,
          backgroundColor: globalStyles.contentBackgroundColor,
          fontFamily: globalStyles.fontFamily,
          color: globalStyles.textColor,
          borderRadius: globalStyles.borderRadius,
        }}
      >
        <div className="p-6">
          {blocks.length === 0 ? (
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-16 text-center transition-all duration-300",
                draggedBlockType 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-muted-foreground/20"
              )}
              onDragOver={(e) => handleDropZoneDragOver(e, 0)}
              onDragLeave={handleDropZoneDragLeave}
              onDrop={() => handleDropZoneDrop(0)}
            >
              <div className="inline-flex p-4 rounded-2xl bg-muted mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mt-2">
                Começa a criar o teu email
              </h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Arrasta elementos do painel lateral ou escolhe um layout para começar
              </p>
            </div>
          ) : (
            <div>
              <DropZone index={0} isFirst />
              
              {blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id;
                const BlockIcon = BLOCK_ICONS[block.type] || Type;
                
                return (
                  <div key={block.id}>
                    <div
                      className={cn(
                        "group relative rounded-lg transition-all duration-200",
                        isSelected 
                          ? "ring-2 ring-primary ring-offset-2" 
                          : "hover:ring-1 hover:ring-muted-foreground/30"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock(block.id);
                      }}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {/* Quick actions toolbar */}
                      <div className={cn(
                        "absolute -top-4 left-1/2 -translate-x-1/2 z-20",
                        "flex items-center gap-0.5 px-2 py-1 rounded-full",
                        "bg-popover border shadow-md",
                        "opacity-0 group-hover:opacity-100 transition-all duration-200",
                        isSelected && "opacity-100"
                      )}>
                        <div className="flex items-center gap-1.5 pr-2 border-r mr-1">
                          <BlockIcon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">
                            {BLOCK_NAMES[block.type]}
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
                          <ChevronUp className="h-3.5 w-3.5" />
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
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="w-px h-4 bg-border mx-0.5" />
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateBlock(block.id);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBlock(block.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="cursor-grab active:cursor-grabbing pl-1 border-l ml-0.5">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Block content */}
                      <div 
                        className="relative"
                        style={{
                          textAlign: block.styles.textAlign as 'left' | 'center' | 'right' | undefined,
                          padding: block.styles.padding,
                          backgroundColor: block.styles.backgroundColor,
                          borderRadius: block.styles.borderRadius,
                          border: block.styles.border,
                          boxShadow: block.styles.boxShadow,
                          minHeight: block.styles.minHeight,
                        }}
                      >
                        {renderBlockPreview(block)}
                      </div>
                    </div>
                    
                    <DropZone index={index + 1} />
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
