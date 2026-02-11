import { Eye, Heart, MessageCircle } from "lucide-react";

interface ListingStatsProps {
  views: number;
  favorites: number;
  messages: number;
}

export function ListingStats({ views, favorites, messages }: ListingStatsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1" title="Visualizações">
        <Eye className="h-3.5 w-3.5" /> {views}
      </span>
      <span className="flex items-center gap-1" title="Favoritos">
        <Heart className="h-3.5 w-3.5" /> {favorites}
      </span>
      <span className="flex items-center gap-1" title="Mensagens">
        <MessageCircle className="h-3.5 w-3.5" /> {messages}
      </span>
    </div>
  );
}
