import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CountdownBlockContent } from '@/types/emailBuilder';

interface CountdownBlockEditorProps {
  content: CountdownBlockContent;
  onUpdate: (updates: Partial<CountdownBlockContent>) => void;
}

export function CountdownBlockEditor({ content, onUpdate }: CountdownBlockEditorProps) {
  const formatDateForInput = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Data e Hora Alvo</Label>
        <Input
          type="datetime-local"
          value={formatDateForInput(content.targetDate)}
          onChange={(e) => onUpdate({ targetDate: new Date(e.target.value).toISOString() })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Título</Label>
        <Input
          value={content.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Oferta Termina Em"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Subtítulo</Label>
        <Input
          value={content.subtitle || ''}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          placeholder="Aproveita antes que acabe!"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Mensagem Expirada</Label>
        <Input
          value={content.expiredMessage || ''}
          onChange={(e) => onUpdate({ expiredMessage: e.target.value })}
          placeholder="A oferta terminou"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Estilo</Label>
        <Select
          value={content.style || 'boxes'}
          onValueChange={(value: 'boxes' | 'inline' | 'minimal') => onUpdate({ style: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boxes">Caixas</SelectItem>
            <SelectItem value="inline">Inline</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Cores
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Cor de Fundo</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.backgroundColor || '#1a1a2e'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.backgroundColor || '#1a1a2e'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor do Texto</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ textColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ textColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor de Destaque</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.accentColor || '#ef4444'}
              onChange={(e) => onUpdate({ accentColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.accentColor || '#ef4444'}
              onChange={(e) => onUpdate({ accentColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
