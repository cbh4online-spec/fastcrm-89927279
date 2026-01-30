import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HeroBlockContent } from '@/types/emailBuilder';

interface HeroBlockEditorProps {
  content: HeroBlockContent;
  onUpdate: (updates: Partial<HeroBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

export function HeroBlockEditor({ content, onUpdate, onOpenImageUploader }: HeroBlockEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Título</Label>
        <Input
          value={content.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título principal"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Subtítulo</Label>
        <Input
          value={content.subtitle || ''}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          placeholder="Subtítulo opcional"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Texto do Botão</Label>
        <Input
          value={content.buttonText || ''}
          onChange={(e) => onUpdate({ buttonText: e.target.value })}
          placeholder="Clica aqui"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">URL do Botão</Label>
        <Input
          value={content.buttonUrl || ''}
          onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Cor do Botão</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={content.buttonColor || '#3b82f6'}
            onChange={(e) => onUpdate({ buttonColor: e.target.value })}
            className="w-12 h-9 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={content.buttonColor || '#3b82f6'}
            onChange={(e) => onUpdate({ buttonColor: e.target.value })}
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fundo
        </h4>

        {onOpenImageUploader && (
          <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
            <Upload className="h-4 w-4 mr-2" />
            Imagem de Fundo
          </Button>
        )}

        <div className="space-y-2">
          <Label className="text-xs">URL da Imagem de Fundo</Label>
          <Input
            value={content.backgroundImage || ''}
            onChange={(e) => onUpdate({ backgroundImage: e.target.value })}
            placeholder="https://..."
          />
        </div>

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
          <Label className="text-xs">Cor do Overlay</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.overlayColor || '#000000'}
              onChange={(e) => onUpdate({ overlayColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.overlayColor || '#000000'}
              onChange={(e) => onUpdate({ overlayColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacidade do Overlay</Label>
            <span className="text-xs text-muted-foreground">
              {Math.round((content.overlayOpacity || 0.5) * 100)}%
            </span>
          </div>
          <Slider
            value={[(content.overlayOpacity || 0.5) * 100]}
            min={0}
            max={100}
            step={5}
            onValueChange={([value]) => onUpdate({ overlayOpacity: value / 100 })}
          />
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Layout
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Altura</Label>
          <Select
            value={content.height || '400px'}
            onValueChange={(value) => onUpdate({ height: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300px">Pequena (300px)</SelectItem>
              <SelectItem value="400px">Média (400px)</SelectItem>
              <SelectItem value="500px">Grande (500px)</SelectItem>
              <SelectItem value="600px">Extra Grande (600px)</SelectItem>
            </SelectContent>
          </Select>
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
