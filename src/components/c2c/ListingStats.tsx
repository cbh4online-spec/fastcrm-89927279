import { Eye, Heart, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ListingStatsProps {
  views: number;
  favorites: number;
  messages: number;
}

export function ListingStats({ views, favorites, messages }: ListingStatsProps) {
  const { t } = useTranslation('marketplace');
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1" title={t('kpiViews')}>
        <Eye className="h-3.5 w-3.5" /> {views}
      </span>
      <span className="flex items-center gap-1" title={t('kpiFavorites')}>
        <Heart className="h-3.5 w-3.5" /> {favorites}
      </span>
      <span className="flex items-center gap-1" title={t('kpiMessages')}>
        <MessageCircle className="h-3.5 w-3.5" /> {messages}
      </span>
    </div>
  );
}
