import { Heart, MapPin, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { C2CListing } from "@/hooks/useC2CListings";

const conditionLabels: Record<string, string> = {
  new: "Novo",
  like_new: "Como novo",
  used: "Usado",
  for_parts: "Para peças",
};

interface ListingCardProps {
  listing: C2CListing;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite, onClick }: ListingCardProps) {
  return (
    <div
      className="group relative rounded-xl border bg-card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* Photo */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {listing.photos && listing.photos.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem foto
          </div>
        )}
        {listing.is_featured && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">Destaque</Badge>
        )}
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <p className="font-bold text-lg text-foreground">
          {listing.price.toFixed(2)} {listing.currency}
        </p>
        <h3 className="font-medium text-sm line-clamp-2 text-foreground">{listing.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {conditionLabels[listing.condition] || listing.condition}
          </Badge>
          {listing.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {listing.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          {listing.views_count} visualizações
        </div>
      </div>
    </div>
  );
}
