import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

interface NexusKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: LucideIcon;
  chartData?: { value: number }[];
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose";
  onClick?: () => void;
}

const colorMap = {
  primary: {
    icon: "bg-primary/10 text-primary",
    chart: "hsl(var(--primary))",
    gradient: "from-primary/5 to-transparent",
    ring: "group-hover:ring-primary/20",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    chart: "hsl(142 76% 36%)",
    gradient: "from-emerald-500/5 to-transparent",
    ring: "group-hover:ring-emerald-500/20",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600",
    chart: "hsl(271 91% 65%)",
    gradient: "from-violet-500/5 to-transparent",
    ring: "group-hover:ring-violet-500/20",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
    chart: "hsl(38 92% 50%)",
    gradient: "from-amber-500/5 to-transparent",
    ring: "group-hover:ring-amber-500/20",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600",
    chart: "hsl(346 77% 50%)",
    gradient: "from-rose-500/5 to-transparent",
    ring: "group-hover:ring-rose-500/20",
  },
};

export function NexusKPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  chartData,
  accentColor = "primary",
  onClick,
}: NexusKPICardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  const colors = colorMap[accentColor];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "bg-card/80 backdrop-blur-sm border-border/50",
        "hover:shadow-lg hover:shadow-black/5 hover:border-border",
        "ring-1 ring-transparent",
        colors.ring,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colors.gradient)} />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          {/* Left side: icon, title, value */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", colors.icon)}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {trend !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                      isPositive && "text-emerald-600 bg-emerald-500/10",
                      isNegative && "text-rose-600 bg-rose-500/10",
                      !isPositive && !isNegative && "text-muted-foreground bg-muted"
                    )}
                  >
                    {isPositive && <ArrowUpRight className="w-3 h-3" />}
                    {isNegative && <ArrowDownRight className="w-3 h-3" />}
                    <span>{Math.abs(trend)}%</span>
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side: mini chart */}
          {chartData && chartData.length > 0 && (
            <div className="w-28 h-16 -mr-2 -mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`nexus-gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.chart} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={colors.chart} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart}
                    strokeWidth={2}
                    fill={`url(#nexus-gradient-${title.replace(/\s/g, '')})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
