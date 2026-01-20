import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Video, Search, Loader2, ChevronDown, ChevronRight, ExternalLink, Play, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductVideoSearchProps {
  productName: string;
  sku?: string;
  videoUrl: string;
  onVideoChange: (url: string) => void;
}

interface VideoResult {
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  source: string;
}

export function ProductVideoSearch({
  productName,
  sku,
  videoUrl,
  onVideoChange,
}: ProductVideoSearchProps) {
  const [isOpen, setIsOpen] = useState(!!videoUrl);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [manualUrl, setManualUrl] = useState("");

  const handleSearch = async () => {
    if (!productName && !sku) {
      toast.error("Introduza um nome de produto ou SKU primeiro");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "search-video",
          productName,
          sku,
        },
      });

      if (error) throw error;

      if (data.success && data.data?.videos) {
        setSearchResults(data.data.videos);
        if (data.data.videos.length === 0) {
          toast.info("Nenhum vídeo de demonstração encontrado");
        }
      } else {
        toast.error(data.error || "Erro na pesquisa de vídeos");
      }
    } catch (error) {
      console.error("Video search error:", error);
      toast.error("Erro ao pesquisar vídeos");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVideo = (video: VideoResult) => {
    onVideoChange(video.url);
    toast.success("Vídeo selecionado!");
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    
    // Basic validation for video URLs
    const isValidUrl = manualUrl.includes("youtube.com") || 
                       manualUrl.includes("youtu.be") || 
                       manualUrl.includes("vimeo.com") ||
                       manualUrl.includes("wistia.com") ||
                       manualUrl.match(/\.(mp4|webm|ogg)$/i);
    
    if (!isValidUrl) {
      toast.error("URL de vídeo inválido. Use YouTube, Vimeo ou link direto.");
      return;
    }

    onVideoChange(manualUrl.trim());
    setManualUrl("");
    toast.success("Vídeo adicionado!");
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // Direct video URL
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    
    return null;
  };

  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;
  const isDirectVideo = videoUrl?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Vídeo de Demonstração
            {videoUrl && (
              <Badge variant="secondary" className="ml-1 text-xs">
                1
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">
          Pesquise automaticamente vídeos de demonstração do produto ou adicione manualmente.
        </p>

        {/* Current video preview */}
        {videoUrl && embedUrl && (
          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Vídeo selecionado</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => onVideoChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video rounded overflow-hidden bg-muted">
              {isDirectVideo ? (
                <video 
                  src={embedUrl} 
                  controls 
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir no original <ExternalLink className="h-3 w-3" />
            </a>
          </Card>
        )}

        {/* Search button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8"
          onClick={handleSearch}
          disabled={isSearching || (!productName && !sku)}
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A pesquisar vídeos...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Pesquisar Vídeos de Demonstração
            </>
          )}
        </Button>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">
              {searchResults.length} vídeos encontrados:
            </span>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((video, idx) => (
                <Card
                  key={idx}
                  className="p-2 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectVideo(video)}
                >
                  <div className="flex gap-3">
                    {video.thumbnail ? (
                      <div className="w-20 h-14 rounded overflow-hidden bg-muted shrink-0 relative">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {video.source}
                        </Badge>
                        {video.duration && (
                          <span className="text-xs text-muted-foreground">
                            {video.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Manual URL input */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Ou adicione manualmente:</span>
          <div className="flex gap-2">
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="h-8 text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleAddManualUrl}
              disabled={!manualUrl.trim()}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
