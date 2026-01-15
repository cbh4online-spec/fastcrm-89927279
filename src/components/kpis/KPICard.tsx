import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { TrendDirection } from "@/types/kpis";

interface KPICardProps {
  label: string;
  value: string | number;
  format?: "number" | "currency" | "percentage" | "time" | "days";
  trend?: TrendDirection;
  trendValue?: string;
  icon?: ReactNode;
  description?: string;
  highlight?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

function formatValue(
  value: string | number,
  format?: "number" | "currency" | "percentage" | "time" | "days"
): string {
  if (typeof value === "string") return value;
  
  switch (format) {
    case "currency":
      if (value >= 1000000) {
        return `€${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `€${(value / 1000).toFixed(1)}K`;
      }
      return `€${value.toLocaleString("pt-PT")}`;
    case "percentage":
      return `${value}%`;
    case "time":
      if (value >= 24) {
        return `${Math.round(value / 24)}d`;
      }
      return `${value}h`;
    case "days":
      return `${value} dias`;
    case "number":
    default:
      return value.toLocaleString("pt-PT");
  }
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

export function KPICard({
  label,
  value,
  format,
  trend,
  trendValue,
  icon,
  description,
  highlight,
  compact,
  className,
  onClick,
}: KPICardProps) {
  const formattedValue = formatValue(value, format);

  const content = (
    <Card
      className={cn(
        "transition-all",
        highlight && "border-primary/50 bg-primary/5",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-sm",
        compact && "p-0",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <div className="text-muted-foreground shrink-0">{icon}</div>
              )}
              <p className={cn(
                "text-sm text-muted-foreground truncate",
                compact && "text-xs"
              )}>
                {label}
              </p>
              {description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={cn(
              "text-2xl font-bold tracking-tight",
              compact && "text-xl",
              highlight && "text-primary"
            )}>
              {formattedValue}
            </p>
          </div>
          
          {trend && (
            <div className="flex items-center gap-1 shrink-0">
              <TrendIcon trend={trend} />
              {trendValue && (
                <span className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-green-600",
                  trend === "down" && "text-red-600",
                  trend === "stable" && "text-muted-foreground"
                )}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return content;
}

// Compact inline KPI for use in tables/lists
export function InlineKPI({
  label,
  value,
  format,
  trend,
  className,
}: Pick<KPICardProps, "label" | "value" | "format" | "trend" | "className">) {
  const formattedValue = formatValue(value, format);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{formattedValue}</span>
      {trend && <TrendIcon trend={trend} />}
    </div>
  );
}

// KPI badge for headers
export function KPIBadge({
  value,
  format,
  trend,
  variant = "default",
  className,
}: {
  value: number | string;
  format?: KPICardProps["format"];
  trend?: TrendDirection;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const formattedValue = formatValue(value, format);
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      variant === "default" && "bg-muted text-muted-foreground",
      variant === "success" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      variant === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      variant === "danger" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      className
    )}>
      {formattedValue}
      {trend && <TrendIcon trend={trend} />}
    </div>
  );
}
