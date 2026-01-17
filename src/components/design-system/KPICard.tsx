import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ============================================
// KPI CARD - Metric Display Components
// ============================================

type TrendDirection = "up" | "down" | "neutral";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
};

const trendStyles = {
  up: { color: "text-success", icon: TrendingUp },
  down: { color: "text-destructive", icon: TrendingDown },
  neutral: { color: "text-muted-foreground", icon: Minus },
};

export function KPICard({
  title,
  value,
  icon,
  trend,
  description,
  variant = "default",
  className,
  onClick,
}: KPICardProps) {
  const styles = variantStyles[variant];
  
  return (
    <Card 
      className={cn(
        "transition-shadow",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("p-2 rounded-lg", styles.iconBg, styles.iconColor)}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {(trend || description) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <div className={cn("flex items-center gap-1 text-xs", trendStyles[trend.direction].color)}>
                {(() => {
                  const TrendIcon = trendStyles[trend.direction].icon;
                  return <TrendIcon className="h-3 w-3" />;
                })()}
                <span>{trend.value > 0 ? "+" : ""}{trend.value}%</span>
                {trend.label && (
                  <span className="text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}
            {description && !trend && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact KPI for inline display
interface CompactKPIProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const compactVariantStyles = {
  default: "bg-muted/50 text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function CompactKPI({
  label,
  value,
  icon,
  variant = "default",
  className,
}: CompactKPIProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg",
      compactVariantStyles[variant],
      className
    )}>
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

// KPI Grid Layout
interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const gridCols = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function KPIGrid({ children, columns = 4, className }: KPIGridProps) {
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Export all for convenience
export const KPIComponents = {
  Card: KPICard,
  Compact: CompactKPI,
  Grid: KPIGrid,
};
