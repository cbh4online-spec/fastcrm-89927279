import { Shield, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RatingStars } from "@/components/c2c/reviews/RatingStars";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SellerBadgeProps {
  seller: {
    display_name: string;
    is_verified?: boolean;
    verification_status?: string;
    avg_rating?: number;
    total_reviews?: number;
    total_sales?: number;
    tier?: string;
  };
  showRating?: boolean;
  compact?: boolean;
  className?: string;
}

const tierColors: Record<string, string> = {
  basic: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-700",
  premium: "bg-amber-100 text-amber-700",
};

export function SellerBadge({ seller, showRating = true, compact = false, className }: SellerBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-medium text-sm text-foreground">{seller.display_name}</span>

      {seller.is_verified && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>Vendedor verificado</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {seller.tier && seller.tier !== "basic" && (
        <Badge className={cn("text-[10px] px-1.5", tierColors[seller.tier] || "")}>
          {seller.tier}
        </Badge>
      )}

      {showRating && seller.avg_rating != null && seller.avg_rating > 0 && !compact && (
        <div className="flex items-center gap-1">
          <RatingStars rating={seller.avg_rating} size="sm" />
          <span className="text-xs text-muted-foreground">({seller.total_reviews || 0})</span>
        </div>
      )}
    </div>
  );
}
