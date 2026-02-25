import { AskResult, AskResultAction, AskResultItem } from "@/hooks/useAskFastCRM";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ListTodo, Eye, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  ListTodo,
  Eye,
  Zap,
};

interface Props {
  result: AskResult;
  onAction: (action: AskResultAction) => void;
  onItemClick?: (item: AskResultItem) => void;
}

export function AskFastCRMResultPanel({ result, onAction, onItemClick }: Props) {
  const TrendIcon =
    result.metric?.trend === "up"
      ? TrendingUp
      : result.metric?.trend === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <p className="font-semibold text-base text-foreground">{result.header}</p>

      {/* Metric card */}
      {result.metric && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">{result.metric.label}</p>
            <p className="text-xl font-bold text-foreground">{result.metric.value}</p>
          </div>
          <TrendIcon
            className={cn(
              "h-5 w-5 ml-auto",
              result.metric.trend === "up" && "text-green-500",
              result.metric.trend === "down" && "text-destructive",
              result.metric.trend === "neutral" && "text-muted-foreground"
            )}
          />
        </div>
      )}

      {/* Items list */}
      {result.items.length > 0 && (
        <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/50">
          {result.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
            >
              {item.health_label && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 shrink-0",
                    item.health_label === "AT_RISK" && "border-destructive/50 text-destructive",
                    item.health_label === "WATCH" && "border-amber-500/50 text-amber-600",
                    item.health_label === "HEALTHY" && "border-green-500/50 text-green-600"
                  )}
                >
                  {item.health_label === "AT_RISK" ? "Risk" : item.health_label === "WATCH" ? "Watch" : "Ok"}
                </Badge>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                )}
              </div>
              {item.value !== undefined && item.value > 0 && (
                <span className="text-sm font-medium text-foreground shrink-0">
                  €{item.value.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      {result.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.actions.map((action) => {
            const Icon = iconMap[action.icon] || Eye;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => onAction(action)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
