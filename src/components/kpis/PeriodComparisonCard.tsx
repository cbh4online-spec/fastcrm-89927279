import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { KPIPeriodComparison, TrendDirection } from "@/types/kpis";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PeriodComparisonCardProps {
  comparison: KPIPeriodComparison | null;
  isLoading?: boolean;
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

function formatChange(value: number, isPercentage = false): string {
  const prefix = value > 0 ? "+" : "";
  if (isPercentage) {
    return `${prefix}${value.toFixed(1)}%`;
  }
  return `${prefix}${value.toLocaleString("pt-PT")}`;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${value.toLocaleString("pt-PT")}`;
}

interface ComparisonRowProps {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
  format?: "number" | "currency" | "percentage";
  invertColors?: boolean; // For metrics where down is good (e.g., response time)
}

function ComparisonRow({
  label,
  current,
  previous,
  change,
  changePercent,
  trend,
  format = "number",
  invertColors = false,
}: ComparisonRowProps) {
  const displayCurrent =
    format === "currency"
      ? formatCurrency(current)
      : format === "percentage"
      ? `${current.toFixed(1)}%`
      : current.toLocaleString("pt-PT");

  const displayPrevious =
    format === "currency"
      ? formatCurrency(previous)
      : format === "percentage"
      ? `${previous.toFixed(1)}%`
      : previous.toLocaleString("pt-PT");

  const isPositive = invertColors ? trend === "down" : trend === "up";
  const isNegative = invertColors ? trend === "up" : trend === "down";

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{displayCurrent}</span>
          <span>vs</span>
          <span>{displayPrevious}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-normal",
            isPositive && "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20",
            isNegative && "border-red-300 text-red-700 bg-red-50 dark:bg-red-900/20",
            trend === "stable" && "border-muted text-muted-foreground"
          )}
        >
          <TrendIcon trend={invertColors ? (trend === "up" ? "down" : trend === "down" ? "up" : "stable") : trend} />
          {formatChange(changePercent, true)}
        </Badge>
      </div>
    </div>
  );
}

export function PeriodComparisonCard({ comparison, isLoading }: PeriodComparisonCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{comparison.period}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ComparisonRow
          label="Leads"
          current={comparison.leads.current}
          previous={comparison.leads.previous}
          change={comparison.leads.change}
          changePercent={comparison.leads.changePercent}
          trend={comparison.leads.trend}
          format="number"
        />
        <ComparisonRow
          label="Oportunidades"
          current={comparison.opportunities.current}
          previous={comparison.opportunities.previous}
          change={comparison.opportunities.change}
          changePercent={comparison.opportunities.changePercent}
          trend={comparison.opportunities.trend}
          format="number"
        />
        <ComparisonRow
          label="Receita"
          current={comparison.revenue.current}
          previous={comparison.revenue.previous}
          change={comparison.revenue.change}
          changePercent={comparison.revenue.changePercent}
          trend={comparison.revenue.trend}
          format="currency"
        />
        <ComparisonRow
          label="Taxa de fecho"
          current={comparison.closeRate.current}
          previous={comparison.closeRate.previous}
          change={comparison.closeRate.change}
          changePercent={comparison.closeRate.changePercent}
          trend={comparison.closeRate.trend}
          format="percentage"
        />
      </CardContent>
    </Card>
  );
}
