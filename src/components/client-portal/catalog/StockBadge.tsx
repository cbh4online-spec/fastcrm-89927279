import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Clock, X } from "lucide-react";
import type { StockStatus } from "@/types/product-operations";
import { stockStatusConfig } from "@/types/product-operations";
import { cn } from "@/lib/utils";

interface StockBadgeProps {
  status: StockStatus;
  notes?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const iconMap = {
  check: Check,
  alert: AlertTriangle,
  clock: Clock,
  x: X,
};

export function StockBadge({ 
  status, 
  notes, 
  showLabel = true, 
  size = "md",
  className 
}: StockBadgeProps) {
  const config = stockStatusConfig[status];
  const Icon = iconMap[config.icon];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Badge
        variant="secondary"
        className={cn(
          config.bgColor,
          config.color,
          "border-0",
          size === "sm" && "text-xs px-1.5 py-0.5"
        )}
      >
        <Icon className={cn(
          "mr-1",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
        )} />
        {showLabel && config.labelPT}
      </Badge>
      {notes && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={notes}>
          {notes}
        </span>
      )}
    </div>
  );
}
