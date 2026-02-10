import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLoyaltyBalance, usePublicLoyaltySettings } from "@/hooks/useStoreLoyalty";

interface StoreLoyaltyWidgetProps {
  workspaceId: string;
  workspaceSlug: string;
  productPrice?: number;
  compact?: boolean;
}

export function StoreLoyaltyWidget({
  workspaceId,
  workspaceSlug,
  productPrice,
  compact = false,
}: StoreLoyaltyWidgetProps) {
  const { data: settings } = usePublicLoyaltySettings(workspaceId);
  const { data: balance = 0 } = useLoyaltyBalance(workspaceId);

  if (!settings?.is_active) return null;

  const earnablePoints = productPrice
    ? Math.floor(productPrice * settings.points_per_euro)
    : null;

  if (compact) {
    return (
      <Link to={`/store/${workspaceSlug}/loyalty`}>
        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {balance} pts
        </Badge>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {balance > 0 && (
        <Link
          to={`/store/${workspaceSlug}/loyalty`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>O seu saldo: <strong className="text-foreground">{balance} pontos</strong></span>
        </Link>
      )}
      {earnablePoints != null && earnablePoints > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400" />
          Ganhe <strong>{earnablePoints} pontos</strong> com esta compra
        </p>
      )}
    </div>
  );
}
