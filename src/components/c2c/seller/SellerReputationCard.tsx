import { Star, Package, ThumbsUp, Clock, TrendingUp, ShieldCheck, Award, Sparkles, Zap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSellerEndorsements } from "@/hooks/useC2CEndorsements";
import { EndorseSellerButton } from "./EndorseSellerButton";
import { FollowSellerButton } from "./FollowSellerButton";
import { useSellerFollowerCount, getFollowerMilestones } from "@/hooks/useC2CFollowers";

interface SellerReputationCardProps {
  sellerId: string;
  workspaceId: string;
  sellerUserId?: string;
  avgRating: number;
  totalReviews: number;
  totalSales: number;
  isVerified: boolean;
  memberSince: string;
  className?: string;
}

interface BadgeInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  tooltip: string;
}

function computeRepBadges(opts: {
  avgRating: number;
  totalReviews: number;
  totalSales: number;
  isVerified: boolean;
  totalEndorsements: number;
}): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  if (opts.isVerified) {
    badges.push({
      key: "verified",
      label: "Verificado",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      tooltip: "Email e telefone verificados",
    });
  }

  if (opts.avgRating >= 4.5 && opts.totalReviews >= 10) {
    badges.push({
      key: "top-seller",
      label: "Top Seller",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      tooltip: `Rating ≥ 4.5 com ${opts.totalReviews}+ avaliações`,
    });
  }

  if (opts.totalSales >= 100) {
    badges.push({
      key: "100-sales",
      label: "100+ Vendas",
      icon: <Package className="h-3.5 w-3.5" />,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      tooltip: "Mais de 100 vendas concluídas",
    });
  }

  if (opts.totalEndorsements >= 5) {
    badges.push({
      key: "recommended",
      label: "Recomendado",
      icon: <ThumbsUp className="h-3.5 w-3.5" />,
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      tooltip: `${opts.totalEndorsements} recomendações de outros utilizadores`,
    });
  }

  return badges;
}

export function SellerReputationCard({
  sellerId,
  workspaceId,
  sellerUserId,
  avgRating,
  totalReviews,
  totalSales,
  isVerified,
  memberSince,
  className,
}: SellerReputationCardProps) {
  const { data: endorsements = [] } = useSellerEndorsements(sellerId);
  const { data: followerCount = 0 } = useSellerFollowerCount(sellerId);
  const totalEndorsements = endorsements.length;

  const badges = computeRepBadges({
    avgRating,
    totalReviews,
    totalSales,
    isVerified,
    totalEndorsements,
  });

  // Add follower milestone badges
  const followerMilestones = getFollowerMilestones(followerCount);
  const followerBadges: BadgeInfo[] = followerMilestones.map((m) => ({
    key: `followers-${m.key}`,
    label: `${m.emoji} ${m.label}`,
    icon: <Users className="h-3.5 w-3.5" />,
    color: m.color,
    tooltip: m.tooltip,
  }));
  const allBadges = [...badges, ...followerBadges];

  const ratingLevel =
    avgRating >= 4.5
      ? { label: "Excelente", color: "text-emerald-600" }
      : avgRating >= 4
      ? { label: "Muito Bom", color: "text-green-600" }
      : avgRating >= 3
      ? { label: "Bom", color: "text-yellow-600" }
      : { label: "Regular", color: "text-orange-600" };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 space-y-4">
        {/* Rating hero */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {totalReviews > 0 ? avgRating.toFixed(1) : "—"}
            </p>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-4 w-4",
                    s <= Math.round(avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            {totalReviews > 0 && (
              <p className={cn("text-xs font-medium mt-0.5", ratingLevel.color)}>
                {ratingLevel.label}
              </p>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3">
            <MetricItem
              icon={<Star className="h-4 w-4 text-amber-500" />}
              value={totalReviews.toString()}
              label="Avaliações"
            />
            <MetricItem
              icon={<Package className="h-4 w-4 text-blue-500" />}
              value={totalSales.toString()}
              label="Vendas"
            />
            <MetricItem
              icon={<Users className="h-4 w-4 text-teal-500" />}
              value={followerCount.toString()}
              label="Seguidores"
            />
            <MetricItem
              icon={<ThumbsUp className="h-4 w-4 text-purple-500" />}
              value={totalEndorsements.toString()}
              label="Recomendações"
            />
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <TooltipProvider>
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <Tooltip key={badge.key}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-[10px] font-medium cursor-default",
                        badge.color
                      )}
                    >
                      {badge.icon}
                      {badge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{badge.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}

        {/* Endorse button */}
        <EndorseSellerButton
          sellerId={sellerId}
          workspaceId={workspaceId}
          endorsements={endorsements}
        />
      </CardContent>
    </Card>
  );
}

function MetricItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-semibold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatMemberSince(isoDate: string): string {
  const months = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  if (months < 1) return "<1 mês";
  if (months < 12) return `${months} mês${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `${years} ano${years > 1 ? "s" : ""}`;
}
