import { Heart, MapPin, Eye, Star, TrendingDown, Flame, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { C2CListing } from "@/hooks/useC2CListings";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const dateLocales: Record<string, Locale> = { pt, en: enUS, es, fr };

interface ListingCardProps {
  listing: C2CListing;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  variant?: "grid" | "carousel";
  isSponsored?: boolean;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite, onClick, variant = "grid", isSponsored }: ListingCardProps) {
  const { t, i18n } = useTranslation('marketplace');
  const conditionLabels: Record<string, { label: string; color: string }> = {
    new: { label: t('conditionNew'), color: "text-green-600 bg-green-50 border-green-200" },
    like_new: { label: t('conditionLikeNew'), color: "text-blue-600 bg-blue-50 border-blue-200" },
    used: { label: t('conditionUsed'), color: "text-amber-600 bg-amber-50 border-amber-200" },
    for_parts: { label: t('conditionForParts'), color: "text-muted-foreground bg-muted" },
  };

  const condition = conditionLabels[listing.condition] || { label: listing.condition, color: "" };
  const locale = dateLocales[i18n.language] || pt;
  const timeAgo = formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale });

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
        variant === "carousel" && "min-w-[220px] max-w-[220px] snap-start"
      )}
      onClick={onClick}
    >
      {/* Photo */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {listing.photos && listing.photos.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isSponsored && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 gap-0.5 border-0">
              <Megaphone className="h-3 w-3" />
              {t('sponsored')}
            </Badge>
          )}
          {listing.is_featured && !isSponsored && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 gap-0.5">
              <Flame className="h-3 w-3" />
              {t('highlight')}
            </Badge>
          )}
          {listing.condition === "new" && (
            <Badge className="bg-green-500 text-white text-[10px] px-1.5">{t('conditionNew')}</Badge>
          )}
        </div>

        {/* Favorite */}
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 rounded-full h-8 w-8 shadow-md transition-all",
              isFavorite
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-background/90 text-muted-foreground hover:bg-background hover:text-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
        )}

        {/* Photo count */}
        {listing.photos && listing.photos.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            📸 {listing.photos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Price */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-bold text-xl text-foreground">
            {listing.price.toFixed(0)}€
          </p>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", condition.color)}>
            {condition.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm line-clamp-2 leading-snug text-foreground min-h-[2.5rem]">
          {listing.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            {listing.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {listing.location}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {listing.views_count}
            </span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
