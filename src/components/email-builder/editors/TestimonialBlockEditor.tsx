import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Star } from 'lucide-react';
import type { TestimonialBlockContent } from '@/types/emailBuilder';

interface TestimonialBlockEditorProps {
  content: TestimonialBlockContent;
  onUpdate: (updates: Partial<TestimonialBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

export function TestimonialBlockEditor({ content, onUpdate, onOpenImageUploader }: TestimonialBlockEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Citação</Label>
        <Textarea
          value={content.quote}
          onChange={(e) => onUpdate({ quote: e.target.value })}
          placeholder="&quot;O testemunho do cliente...&quot;"
          className="min-h-[100px] text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Nome do Autor</Label>
        <Input
          value={content.authorName}
          onChange={(e) => onUpdate({ authorName: e.target.value })}
          placeholder="Maria Silva"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Título/Cargo</Label>
        <Input
          value={content.authorTitle || ''}
          onChange={(e) => onUpdate({ authorTitle: e.target.value })}
          placeholder="CEO, Empresa XYZ"
        />
      </div>

      {onOpenImageUploader && (
        <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
          <Upload className="h-4 w-4 mr-2" />
          Foto do Autor
        </Button>
      )}

      <div className="space-y-2">
        <Label className="text-xs">URL da Foto</Label>
        <Input
          value={content.authorImage || ''}
          onChange={(e) => onUpdate({ authorImage: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Avaliação (Estrelas)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onUpdate({ rating: star })}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= (content.rating || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ rating: 0 })}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Logo da Empresa (opcional)</Label>
        <Input
          value={content.companyLogo || ''}
          onChange={(e) => onUpdate({ companyLogo: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
