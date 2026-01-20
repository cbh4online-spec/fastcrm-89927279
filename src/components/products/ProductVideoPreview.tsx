import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Video } from "lucide-react";

interface ProductVideoPreviewProps {
  videoUrl: string;
  productName?: string;
  compact?: boolean;
}

export function ProductVideoPreview({ videoUrl, productName, compact = false }: ProductVideoPreviewProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  const getVideoType = (url: string): 'youtube' | 'vimeo' | 'direct' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'direct';
  };

  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getVimeoId = (url: string): string | null => {
    const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const videoType = getVideoType(videoUrl);
  const youtubeId = videoType === 'youtube' ? getYouTubeId(videoUrl) : null;
  const vimeoId = videoType === 'vimeo' ? getVimeoId(videoUrl) : null;

  const getThumbnail = (): string | null => {
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }
    return null;
  };

  const thumbnail = getThumbnail();

  if (compact) {
    return (
      <a 
        href={videoUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
      >
        <Video className="h-3.5 w-3.5" />
        Ver vídeo demo
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  if (!showEmbed && thumbnail) {
    return (
      <div className="space-y-2">
        <div 
          className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => setShowEmbed(true)}
        >
          <img 
            src={thumbnail} 
            alt={`Thumbnail de ${productName || 'vídeo'}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-8 w-8 text-primary-foreground ml-1" />
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(videoUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir em Nova Tab
        </Button>
      </div>
    );
  }

  if (youtubeId) {
    return (
      <div className="space-y-2">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title={productName || "Vídeo do produto"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(videoUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir em Nova Tab
        </Button>
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className="space-y-2">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
            title={productName || "Vídeo do produto"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(videoUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir em Nova Tab
        </Button>
      </div>
    );
  }

  // Direct video link
  return (
    <div className="space-y-2">
      <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
        <Video className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{productName || 'Vídeo Demo'}</p>
          <p className="text-xs text-muted-foreground truncate">{videoUrl}</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => window.open(videoUrl, '_blank')}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Abrir Vídeo
      </Button>
    </div>
  );
}
