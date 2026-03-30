import { useState, useCallback, type DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EbookVisualBlock } from './EbookVisualBlock';
import { PageLayoutSelector } from './PageLayoutSelector';
import type { ContentBlock, PageLayout, EbookChapter } from '@/hooks/useEbooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Type, Heading1, ImageIcon, Quote, Minus, List, ListOrdered,
  Table2, Columns2, MousePointer, Space,
} from 'lucide-react';

interface EbookPageCanvasProps {
  chapter: EbookChapter;
  onUpdateChapter: (chapter: EbookChapter) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  globalStyles?: Record<string, unknown>;
}

const BLOCK_PRESETS: { type: ContentBlock['type']; label: string; icon: any; defaultContent: string; defaultStyles: ContentBlock['styles'] }[] = [
  { type: 'heading', label: 'Título', icon: Heading1, defaultContent: '<h2>Título</h2>', defaultStyles: { paddingTop: '8px', paddingBottom: '4px', fontSize: '24px', fontWeight: '700' } },
  { type: 'paragraph', label: 'Parágrafo', icon: Type, defaultContent: '<p>Escreva aqui...</p>', defaultStyles: { paddingTop: '4px', paddingBottom: '4px', fontSize: '16px', lineHeight: '1.7' } },
  { type: 'image', label: 'Imagem', icon: ImageIcon, defaultContent: '', defaultStyles: { paddingTop: '8px', paddingBottom: '8px', borderRadius: '8px' } },
  { type: 'quote', label: 'Citação', icon: Quote, defaultContent: 'Insira a sua citação aqui...', defaultStyles: { paddingTop: '12px', paddingBottom: '12px', paddingLeft: '16px', fontSize: '16px' } },
  { type: 'divider', label: 'Divisor', icon: Minus, defaultContent: '', defaultStyles: { marginTop: '16px', marginBottom: '16px' } },
  { type: 'list', label: 'Lista', icon: List, defaultContent: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>', defaultStyles: { paddingTop: '4px', paddingBottom: '4px' } },
  { type: 'cta', label: 'CTA / Link', icon: MousePointer, defaultContent: '<a href="#">Clique aqui</a>', defaultStyles: { paddingTop: '12px', paddingBottom: '12px', textAlign: 'center', fontSize: '16px', fontWeight: '600' } },
  { type: 'table', label: 'Tabela', icon: Table2, defaultContent: '<table><tr><th>Col 1</th><th>Col 2</th></tr><tr><td>Dados</td><td>Dados</td></tr></table>', defaultStyles: { paddingTop: '8px', paddingBottom: '8px' } },
  { type: 'columns', label: '2 Colunas', icon: Columns2, defaultContent: '', defaultStyles: { paddingTop: '8px', paddingBottom: '8px', gap: '16px' } },
  { type: 'spacer', label: 'Espaço', icon: Space, defaultContent: '', defaultStyles: { minHeight: '32px' } },
];

function createBlock(preset: typeof BLOCK_PRESETS[0], insertIndex?: number): ContentBlock {
  const block: ContentBlock = {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: preset.type,
    content: preset.defaultContent,
    styles: { ...preset.defaultStyles },
  };
  if (preset.type === 'columns') {
    block.children = [
      { id: `blk-${Date.now()}-c1`, type: 'paragraph', content: '<p>Coluna esquerda</p>', styles: {} },
      { id: `blk-${Date.now()}-c2`, type: 'paragraph', content: '<p>Coluna direita</p>', styles: {} },
    ];
  }
  return block;
}

const LAYOUT_CLASSES: Record<PageLayout, string> = {
  'single': '',
  'two-col-50': 'grid grid-cols-2 gap-4',
  'two-col-60-40': 'grid grid-cols-[3fr_2fr] gap-4',
  'two-col-40-60': 'grid grid-cols-[2fr_3fr] gap-4',
  'hero-image': '',
  'text-image-split': 'grid grid-cols-2 gap-4',
  'three-col': 'grid grid-cols-3 gap-4',
};

export function EbookPageCanvas({
  chapter,
  onUpdateChapter,
  selectedBlockId,
  onSelectBlock,
  globalStyles,
}: EbookPageCanvasProps) {
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const blocks = chapter.blocks || [];
  const layout = chapter.layout || 'single';

  const updateBlocks = useCallback((newBlocks: ContentBlock[]) => {
    onUpdateChapter({ ...chapter, blocks: newBlocks });
  }, [chapter, onUpdateChapter]);

  const addBlock = useCallback((preset: typeof BLOCK_PRESETS[0], atIndex?: number) => {
    const block = createBlock(preset);
    const newBlocks = [...blocks];
    if (atIndex !== undefined) {
      newBlocks.splice(atIndex, 0, block);
    } else {
      newBlocks.push(block);
    }
    updateBlocks(newBlocks);
    onSelectBlock(block.id);
  }, [blocks, updateBlocks, onSelectBlock]);

  const updateBlock = useCallback((updated: ContentBlock) => {
    updateBlocks(blocks.map(b => b.id === updated.id ? updated : b));
  }, [blocks, updateBlocks]);

  const deleteBlock = useCallback((id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) onSelectBlock(null);
  }, [blocks, updateBlocks, selectedBlockId, onSelectBlock]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const dup: ContentBlock = {
      ...blocks[idx],
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      styles: { ...blocks[idx].styles },
      children: blocks[idx].children?.map(c => ({ ...c, id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 4)}` })),
    };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, dup);
    updateBlocks(newBlocks);
    onSelectBlock(dup.id);
  }, [blocks, updateBlocks, onSelectBlock]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Drag handlers
  const handleDragStart = (_e: DragEvent, index: number) => setDragSourceIndex(index);
  const handleDragOver = (e: DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (_e: DragEvent, targetIndex: number) => {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragSourceIndex, 1);
    newBlocks.splice(targetIndex, 0, moved);
    updateBlocks(newBlocks);
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragSourceIndex(null); setDragOverIndex(null); };

  const updateLayout = useCallback((newLayout: PageLayout) => {
    onUpdateChapter({ ...chapter, layout: newLayout });
  }, [chapter, onUpdateChapter]);

  const AddBlockButton = ({ atIndex }: { atIndex?: number }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md border border-dashed border-transparent hover:border-primary/20 transition-all group">
          <Plus className="h-3 w-3" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">Adicionar bloco</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {BLOCK_PRESETS.map(preset => (
          <DropdownMenuItem key={preset.type} onClick={() => addBlock(preset, atIndex)}>
            <preset.icon className="h-3.5 w-3.5 mr-2" />
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className="px-6 py-6 bg-card rounded-lg shadow mx-4 mb-6 min-h-[50vh]"
      onClick={() => onSelectBlock(null)}
      style={{
        fontFamily: globalStyles?.bodyFont ? String(globalStyles.bodyFont) : undefined,
        ...(() => {
          if (!globalStyles) return {};
          const vars: Record<string, string> = {};
          if (globalStyles.primaryColor) vars['--ebook-primary'] = String(globalStyles.primaryColor);
          if (globalStyles.headingFont) vars['--ebook-heading-font'] = String(globalStyles.headingFont);
          if (globalStyles.bodyFont) vars['--ebook-body-font'] = String(globalStyles.bodyFont);
          return vars;
        })(),
      } as React.CSSProperties}
    >
      {/* Layout selector (compact) */}
      <div className="mb-4 pb-3 border-b border-border/30">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Layout da Página</span>
        <PageLayoutSelector value={layout} onChange={updateLayout} />
      </div>

      {/* Blocks canvas */}
      <div className={cn("relative", LAYOUT_CLASSES[layout])}>
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">Página vazia — adicione blocos</p>
            <AddBlockButton />
          </div>
        ) : (
          <div className="space-y-1 pl-8">
            {blocks.map((block, i) => (
              <div key={block.id}>
                <AddBlockButton atIndex={i} />
                <EbookVisualBlock
                  block={block}
                  index={i}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onUpdate={updateBlock}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, 'up')}
                  onMoveDown={() => moveBlock(block.id, 'down')}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === i}
                />
              </div>
            ))}
            <AddBlockButton atIndex={blocks.length} />
          </div>
        )}
      </div>
    </div>
  );
}
