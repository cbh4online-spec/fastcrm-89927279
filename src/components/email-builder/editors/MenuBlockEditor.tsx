import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MenuBlockContent } from '@/types/emailBuilder';

interface MenuBlockEditorProps {
  content: MenuBlockContent;
  onUpdate: (updates: Partial<MenuBlockContent>) => void;
}

export function MenuBlockEditor({ content, onUpdate }: MenuBlockEditorProps) {
  const addItem = () => {
    const newItems = [...content.items, { text: 'Novo Link', url: '#' }];
    onUpdate({ items: newItems });
  };

  const updateItem = (index: number, field: 'text' | 'url', value: string) => {
    const newItems = [...content.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = content.items.filter((_, i) => i !== index);
    onUpdate({ items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= content.items.length) return;
    
    const newItems = [...content.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate({ items: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Links do Menu</Label>
          <Button variant="ghost" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {content.items.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 space-y-1.5">
                <Input
                  value={item.text}
                  onChange={(e) => updateItem(index, 'text', e.target.value)}
                  placeholder="Texto do link"
                  className="h-8 text-xs"
                />
                <Input
                  value={item.url}
                  onChange={(e) => updateItem(index, 'url', e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Opções
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Separador</Label>
          <Input
            value={content.separator || '|'}
            onChange={(e) => onUpdate({ separator: e.target.value })}
            placeholder="|"
            className="w-full font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Alinhamento</Label>
          <Select
            value={content.alignment || 'center'}
            onValueChange={(value: 'left' | 'center' | 'right') => onUpdate({ alignment: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
