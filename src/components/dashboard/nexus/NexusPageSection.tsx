import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NexusPageSectionProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  glass?: boolean;
}

export function NexusPageSection({
  title,
  subtitle,
  actions,
  children,
  className,
  noPadding = false,
  glass = true,
}: NexusPageSectionProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300",
        glass && "bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg hover:shadow-black/5",
        !noPadding && "p-5",
        className
      )}
    >
      {(title || subtitle || actions) && (
        <div className={cn("flex items-start justify-between gap-4", !noPadding && "mb-4")}>
          <div className="space-y-0.5">
            {title && <h3 className="text-base font-semibold">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}

interface NexusGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

const gapMap = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

export function NexusGrid({
  children,
  cols = 3,
  gap = "md",
  className,
}: NexusGridProps) {
  return (
    <div className={cn("grid", colsMap[cols], gapMap[gap], className)}>
      {children}
    </div>
  );
}

interface NexusStatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose";
  onClick?: () => void;
}

const accentColorMap = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

export function NexusStatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  accentColor = "primary",
  onClick,
}: NexusStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
        "transition-all duration-200 hover:bg-card hover:border-border",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn("p-2 rounded-lg", accentColorMap[accentColor])}>
            {icon}
          </div>
        )}
        {trend !== undefined && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded-full",
              trend > 0 ? "text-emerald-600 bg-emerald-500/10" : 
              trend < 0 ? "text-rose-600 bg-rose-500/10" : 
              "text-muted-foreground bg-muted"
            )}
          >
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {trendLabel && (
          <p className="text-[10px] text-muted-foreground/70 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
