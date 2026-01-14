import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Type,
  Image,
  Square,
  Columns,
  Minus,
  Plus,
  GripVertical,
  Trash2,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'columns' | 'spacer';
  content: any;
}

interface RichTemplateEditorProps {
  value: RichBlock[] | null;
  onChange: (blocks: RichBlock[]) => void;
  textContent: string;
  onTextChange: (text: string) => void;
}

const blockTypes = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagem', icon: Image },
  { type: 'button', label: 'Botão', icon: Square },
  { type: 'columns', label: 'Colunas', icon: Columns },
  { type: 'spacer', label: 'Espaçador', icon: Minus },
];

export function RichTemplateEditor({ value, onChange, textContent, onTextChange }: RichTemplateEditorProps) {
  const blocks = value || [];

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addBlock = (type: RichBlock['type']) => {
    const newBlock: RichBlock = {
      id: generateId(),
      type,
      content: getDefaultContent(type),
    };
    onChange([...blocks, newBlock]);
  };

  const getDefaultContent = (type: RichBlock['type']) => {
    switch (type) {
      case 'text':
        return { text: '', align: 'left' };
      case 'image':
        return { url: '', alt: '', width: '100%' };
      case 'button':
        return { text: 'Clica aqui', url: '', color: '#6366f1' };
      case 'columns':
        return { columns: [{ text: '' }, { text: '' }] };
      case 'spacer':
        return { height: 24 };
      default:
        return {};
    }
  };

  const updateBlock = (id: string, content: any) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const renderBlockEditor = (block: RichBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <Textarea
            value={block.content.text}
            onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
            placeholder="Escreve o texto aqui..."
            className="min-h-[100px]"
          />
        );
      case 'image':
        return (
          <div className="space-y-2">
            <Input
              value={block.content.url}
              onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
              placeholder="URL da imagem"
            />
            <Input
              value={block.content.alt}
              onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
              placeholder="Texto alternativo"
            />
          </div>
        );
      case 'button':
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.content.text}
              onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
              placeholder="Texto do botão"
            />
            <Input
              value={block.content.url}
              onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
              placeholder="URL de destino"
            />
          </div>
        );
      case 'columns':
        return (
          <div className="grid grid-cols-2 gap-2">
            {block.content.columns.map((col: any, idx: number) => (
              <Textarea
                key={idx}
                value={col.text}
                onChange={(e) => {
                  const newCols = [...block.content.columns];
                  newCols[idx] = { ...newCols[idx], text: e.target.value };
                  updateBlock(block.id, { ...block.content, columns: newCols });
                }}
                placeholder={`Coluna ${idx + 1}`}
                className="min-h-[80px]"
              />
            ))}
          </div>
        );
      case 'spacer':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Altura:</span>
            <Input
              type="number"
              value={block.content.height}
              onChange={(e) => updateBlock(block.id, { height: parseInt(e.target.value) || 24 })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Fallback text content */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          Texto simples (fallback para clientes que não suportam rich content)
        </label>
        <Textarea
          value={textContent}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Versão texto simples..."
          className="mt-1 min-h-[100px]"
        />
      </div>

      {/* Rich Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Blocos de conteúdo</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar bloco
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {blockTypes.map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem key={type} onClick={() => addBlock(type as RichBlock['type'])}>
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {blocks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Adiciona blocos para criar a tua proposta</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, index) => {
              const blockType = blockTypes.find(b => b.type === block.type);
              const Icon = blockType?.icon || Type;
              
              return (
                <Card key={block.id} className="group">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveBlock(block.id, 'up')}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveBlock(block.id, 'down')}
                          disabled={index === blocks.length - 1}
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            <Icon className="h-3 w-3 mr-1" />
                            {blockType?.label}
                          </Badge>
                        </div>
                        {renderBlockEditor(block)}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100"
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
