import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ImageTextBlockContent } from '@/types/emailBuilder';

interface ImageTextBlockEditorProps {
  content: ImageTextBlockContent;
  onUpdate: (updates: Partial<ImageTextBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

export function ImageTextBlockEditor({ content, onUpdate, onOpenImageUploader }: ImageTextBlockEditorProps) {
  return (
    <div className="space-y-4">
      {onOpenImageUploader && (
        <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
          <Upload className="h-4 w-4 mr-2" />
          Carregar Imagem
        </Button>
      )}

      <div className="space-y-2">
        <Label className="text-xs">URL da Imagem</Label>
        <Input
          value={content.imageSrc}
          onChange={(e) => onUpdate({ imageSrc: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Texto Alternativo</Label>
        <Input
          value={content.imageAlt}
          onChange={(e) => onUpdate({ imageAlt: e.target.value })}
          placeholder="Descrição da imagem"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Posição da Imagem</Label>
          <Select
            value={content.imagePosition}
            onValueChange={(value: 'left' | 'right') => onUpdate({ imagePosition: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Largura da Imagem</Label>
          <Select
            value={content.imageWidth}
            onValueChange={(value: '30' | '40' | '50' | '60') => onUpdate({ imageWidth: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30%</SelectItem>
              <SelectItem value="40">40%</SelectItem>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="60">60%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Conteúdo
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Título</Label>
          <Input
            value={content.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Título da secção"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Texto</Label>
          <Textarea
            value={content.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Descrição do conteúdo..."
            className="min-h-[80px] text-xs"
          />
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Botão (opcional)
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Texto do Botão</Label>
          <Input
            value={content.buttonText || ''}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
            placeholder="Saber Mais"
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
      </div>
    </div>
  );
}
