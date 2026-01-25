import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

interface KPICardWithChartProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  chartData?: { value: number }[];
  chartColor?: string;
  onClick?: () => void;
}

export function KPICardWithChart({
  title,
  value,
  trend,
  trendLabel = "vs período anterior",
  chartData,
  chartColor = "hsl(var(--primary))",
  onClick,
}: KPICardWithChartProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card
      className={cn(
        "p-5 cursor-pointer transition-all hover:shadow-md bg-card border",
        onClick && "hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  isPositive && "text-emerald-600",
                  isNegative && "text-red-500",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}
              >
                {isPositive && <ArrowUp className="w-3 h-3" />}
                {isNegative && <ArrowDown className="w-3 h-3" />}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <button className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
            Ver detalhes
            <span className="text-primary">›</span>
          </button>
        </div>

        {chartData && chartData.length > 0 && (
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
