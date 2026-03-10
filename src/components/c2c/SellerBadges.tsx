import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, Award, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SellerBadgeType = "rookie" | "trusted" | "super_seller" | "verified" | "top_rated";

interface SellerBadgeInfo {
  type: SellerBadgeType;
  label: string;
  icon: React.ReactNode;
  className: string;
  tooltip: string;
}

function computeBadges(
  t: (key: string) => string,
  opts: {
    avgRating: number;
    totalReviews: number;
    totalSales: number;
    isVerified: boolean;
    memberSinceDays: number;
  }
): SellerBadgeInfo[] {
  const badges: SellerBadgeInfo[] = [];

  if (opts.isVerified) {
    badges.push({
      type: "verified",
      label: t("badgeVerified"),
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      className: "bg-primary/10 text-primary border-primary/20",
      tooltip: t("badgeVerifiedDesc"),
    });
  }

  if (opts.avgRating >= 4.5 && opts.totalReviews >= 10 && opts.totalSales >= 20) {
    badges.push({
      type: "super_seller",
      label: t("badgeSuperSeller"),
      icon: <Sparkles className="h-3.5 w-3.5" />,
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      tooltip: t("badgeSuperSellerDesc"),
    });
  } else if (opts.avgRating >= 4.0 && opts.totalReviews >= 5) {
    badges.push({
      type: "top_rated",
      label: t("badgeTopRated"),
      icon: <Award className="h-3.5 w-3.5" />,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      tooltip: t("badgeTopRatedDesc"),
    });
  } else if (opts.totalSales >= 5) {
    badges.push({
      type: "trusted",
      label: t("badgeTrusted"),
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      tooltip: t("badgeTrustedDesc"),
    });
  }

  if (opts.memberSinceDays < 30 && opts.totalSales === 0) {
    badges.push({
      type: "rookie",
      label: t("badgeRookie"),
      icon: <Star className="h-3.5 w-3.5" />,
      className: "bg-muted text-muted-foreground border-border",
      tooltip: t("badgeRookieDesc"),
    });
  }

  return badges;
}

interface SellerBadgesProps {
  avgRating: number;
  totalReviews: number;
  totalSales: number;
  isVerified: boolean;
  memberSince: string; // ISO date
  compact?: boolean;
}

export function SellerBadges({
  avgRating,
  totalReviews,
  totalSales,
  isVerified,
  memberSince,
  compact = false,
}: SellerBadgesProps) {
  const { t } = useTranslation("marketplace");
  const memberSinceDays = Math.floor(
    (Date.now() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24)
  );

  const badges = computeBadges(t, {
    avgRating,
    totalReviews,
    totalSales,
    isVerified,
    memberSinceDays,
  });

  if (badges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
        {badges.map((badge) => (
          <Tooltip key={badge.type}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px] font-medium cursor-default",
                  compact && "px-1.5 py-0",
                  badge.className
                )}
              >
                {badge.icon}
                {!compact && badge.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{badge.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Simple inline star rating display
export function SellerRatingInline({
  avgRating,
  totalReviews,
}: {
  avgRating: number;
  totalReviews: number;
}) {
  const { t } = useTranslation("marketplace");
  if (totalReviews === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3 w-3",
              star <= Math.round(avgRating)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">
        ({totalReviews} {t("reviews")})
      </span>
    </div>
  );
}
