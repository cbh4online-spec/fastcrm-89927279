import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { VideoBlockContent } from '@/types/emailBuilder';

interface VideoBlockEditorProps {
  content: VideoBlockContent;
  onUpdate: (updates: Partial<VideoBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

export function VideoBlockEditor({ content, onUpdate, onOpenImageUploader }: VideoBlockEditorProps) {
  return (
    <div className="space-y-4">
      {onOpenImageUploader && (
        <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
          <Upload className="h-4 w-4 mr-2" />
          Thumbnail do Vídeo
        </Button>
      )}

      <div className="space-y-2">
        <Label className="text-xs">URL da Thumbnail</Label>
        <Input
          value={content.thumbnailUrl}
          onChange={(e) => onUpdate({ thumbnailUrl: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          Imagem de preview que aparece antes de clicar no vídeo
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">URL do Vídeo</Label>
        <Input
          value={content.videoUrl}
          onChange={(e) => onUpdate({ videoUrl: e.target.value })}
          placeholder="https://youtube.com/..."
        />
        <p className="text-xs text-muted-foreground">
          Link para YouTube, Vimeo ou página de destino
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Cor do Botão Play</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={content.playButtonColor || '#ffffff'}
            onChange={(e) => onUpdate({ playButtonColor: e.target.value })}
            className="w-12 h-9 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={content.playButtonColor || '#ffffff'}
            onChange={(e) => onUpdate({ playButtonColor: e.target.value })}
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
