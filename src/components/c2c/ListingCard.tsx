import { Heart, MapPin, Eye, Star, TrendingDown, Flame, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { getThumbnailUrl } from "@/lib/imageOptimizer";
import type { C2CListing } from "@/hooks/useC2CListings";
import { formatDistanceToNow, type Locale as DateLocale } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const dateLocales: Record<string, DateLocale> = { pt, en: enUS, es, fr };

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
        "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5",
        variant === "carousel" && "min-w-[220px] max-w-[220px] snap-start",
        isSponsored
          ? "border-2 border-amber-400/60 bg-gradient-to-b from-amber-50/80 to-white shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/15 ring-1 ring-amber-400/20"
          : "border bg-card hover:shadow-xl"
      )}
      onClick={onClick}
    >
      {/* Sponsored glow accent */}
      {isSponsored && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent pointer-events-none z-10" />
      )}

      {/* Photo */}
      <div className={cn(
        "aspect-[4/3] bg-muted relative overflow-hidden",
        isSponsored && "ring-1 ring-inset ring-amber-400/10"
      )}>
        {listing.photos && listing.photos.length > 0 ? (
          <OptimizedImage
            src={getThumbnailUrl(listing.photos[0])}
            fallbackSrc={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {isSponsored && (
            <Badge className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] px-2 py-0.5 gap-1 border-0 shadow-lg shadow-amber-500/30 animate-pulse">
              <Sparkles className="h-3 w-3" />
              Patrocinado
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

        {/* Sponsored top ribbon */}
        {isSponsored && (
          <div className="absolute top-0 right-0 z-20">
            <div className="w-0 h-0 border-t-[28px] border-t-amber-500 border-l-[28px] border-l-transparent" />
            <Megaphone className="absolute top-0.5 right-0.5 h-3 w-3 text-white" />
          </div>
        )}

        {/* Favorite */}
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 rounded-full h-8 w-8 shadow-md transition-all z-20",
              isSponsored && "top-8",
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
          <div className="absolute bottom-2 left-2 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded-full font-medium z-20">
            📸 {listing.photos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 relative">
        {/* Price */}
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            "font-bold text-xl",
            isSponsored ? "text-amber-700" : "text-foreground"
          )}>
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
