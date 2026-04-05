import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, AlertTriangle, ShieldX } from "lucide-react";
import { type PricingRule, getMarginStatus, calculateMinPrice } from "@/hooks/useProductPricingIntelligence";

interface MarginStatusBadgeProps {
  price: number | null | undefined;
  cost: number | null | undefined;
  category?: string | null;
  rules: PricingRule[];
  compact?: boolean;
}

export function MarginStatusBadge({ price, cost, category, rules, compact = true }: MarginStatusBadgeProps) {
  const { status, minMargin, currentMargin } = getMarginStatus(price, cost, rules, category);

  if (status === "unknown") return null;

  const config = {
    healthy: {
      icon: ShieldCheck,
      color: "text-green-500",
      tooltip: `Margem ${currentMargin?.toFixed(1)}% — acima do mínimo (${minMargin}%)`,
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-500",
      tooltip: `Margem ${currentMargin?.toFixed(1)}% — abaixo do mínimo recomendado (${minMargin}%)`,
    },
    danger: {
      icon: ShieldX,
      color: "text-red-500",
      tooltip: `Margem negativa (${currentMargin?.toFixed(1)}%) — vendendo abaixo do custo!`,
    },
  };

  const cfg = config[status];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`h-3.5 w-3.5 ${cfg.color} inline-block`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-48">
          {cfg.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge
      variant={status === "danger" ? "destructive" : status === "warning" ? "secondary" : "default"}
      className="text-[10px]"
    >
      <Icon className="h-3 w-3 mr-1" />
      {currentMargin?.toFixed(1)}%
    </Badge>
  );
}
