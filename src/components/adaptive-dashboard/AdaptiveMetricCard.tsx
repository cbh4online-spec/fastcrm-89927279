import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, BarChart3, Calendar } from "lucide-react";
import type { AdaptiveMetric } from "@/data/adaptiveDashboardMock";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
};

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency': return `€${value.toLocaleString('pt-PT')}`;
    case 'percentage': return `${value}%`;
    case 'time': return `${value}h`;
    default: return value.toLocaleString('pt-PT');
  }
}

interface AdaptiveMetricCardProps {
  metric: AdaptiveMetric;
  textSizeClass?: string;
  className?: string;
}

export function AdaptiveMetricCard({ metric, textSizeClass = 'text-base', className }: AdaptiveMetricCardProps) {
  const Icon = iconMap[metric.icon] || TrendingUp;

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-sm font-medium text-muted-foreground", textSizeClass === 'text-lg' && 'text-base')}>
            {metric.label}
          </span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className={cn("font-bold mb-3", textSizeClass === 'text-lg' ? 'text-3xl' : 'text-2xl')}>
          {formatValue(metric.value, metric.format)}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <ChangeTag value={metric.changeWeek} label="sem" />
          <ChangeTag value={metric.changeMonth} label="mês" />
        </div>

        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {metric.projectionLabel}: <span className="font-semibold text-foreground">{formatValue(metric.projection, metric.format)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangeTag({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium",
      isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    )}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value}% <span className="text-muted-foreground font-normal">/{label}</span>
    </span>
  );
}
