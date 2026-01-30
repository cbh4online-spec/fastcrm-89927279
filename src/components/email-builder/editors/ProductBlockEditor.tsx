import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { ProductBlockContent } from '@/types/emailBuilder';

interface ProductBlockEditorProps {
  content: ProductBlockContent;
  onUpdate: (updates: Partial<ProductBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

export function ProductBlockEditor({ content, onUpdate, onOpenImageUploader }: ProductBlockEditorProps) {
  return (
    <div className="space-y-4">
      {onOpenImageUploader && (
        <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
          <Upload className="h-4 w-4 mr-2" />
          Imagem do Produto
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
        <Label className="text-xs">Nome do Produto</Label>
        <Input
          value={content.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nome do produto"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Descrição</Label>
        <Textarea
          value={content.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Descrição do produto"
          className="min-h-[80px] text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Preço Atual</Label>
          <Input
            value={content.price}
            onChange={(e) => onUpdate({ price: e.target.value })}
            placeholder="€49,99"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Preço Original</Label>
          <Input
            value={content.originalPrice || ''}
            onChange={(e) => onUpdate({ originalPrice: e.target.value })}
            placeholder="€79,99"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Badge/Etiqueta</Label>
        <Input
          value={content.badge || ''}
          onChange={(e) => onUpdate({ badge: e.target.value })}
          placeholder="OFERTA, NOVO, -30%"
        />
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Botão
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Texto do Botão</Label>
          <Input
            value={content.buttonText}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
            placeholder="Comprar Agora"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">URL do Botão</Label>
          <Input
            value={content.buttonUrl}
            onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor do Botão</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.buttonColor || '#10b981'}
              onChange={(e) => onUpdate({ buttonColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.buttonColor || '#10b981'}
              onChange={(e) => onUpdate({ buttonColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
