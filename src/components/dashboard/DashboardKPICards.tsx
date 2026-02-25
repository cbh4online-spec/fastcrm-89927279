import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Target, Briefcase, FileText, Clock, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface KPIData {
  leadsToday: number;
  leadsWeek: number;
  leadsTrend: number;
  activeOpportunities: number;
  opportunitiesValue: number;
  opportunitiesTrend: number;
  proposalsSent: number;
  proposalsTrend: number;
  proposalsPending: number;
  revenueForecast: number;
  revenueTrend: number;
}

interface DashboardKPICardsProps {
  data: KPIData | null;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function TrendIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const sizeClass = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span className={cn("flex items-center gap-0.5", sizeClass, isPositive ? "text-emerald-600" : "text-red-500")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {Math.abs(value)}%
    </span>
  );
}

function KPICard({
  title, mainValue, subtitle, trend, icon: Icon, tooltip, accentColor = "primary", isLoading,
}: {
  title: string; mainValue: string | number; subtitle?: string; trend?: number;
  icon: React.ElementType; tooltip: string; accentColor?: "primary" | "emerald" | "amber" | "blue"; isLoading?: boolean;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    blue: "bg-blue-500/10 text-blue-600",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="hover:shadow-md transition-all cursor-help group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", colorClasses[accentColor])}>
                  <Icon className="h-4 w-4" />
                </div>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{mainValue}</span>
                    {trend !== undefined && <TrendIndicator value={trend} />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{title}</p>
                  {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
                </>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DashboardKPICards({ data, isLoading }: DashboardKPICardsProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        title={t('leads')}
        mainValue={data?.leadsToday ?? 0}
        subtitle={t('thisWeek', { count: data?.leadsWeek ?? 0 })}
        trend={data?.leadsTrend}
        icon={Target}
        tooltip={t('leadsTooltip')}
        accentColor="emerald"
        isLoading={isLoading}
      />
      <KPICard
        title={t('activeOpportunities')}
        mainValue={data?.activeOpportunities ?? 0}
        subtitle={formatCurrency(data?.opportunitiesValue ?? 0)}
        trend={data?.opportunitiesTrend}
        icon={Briefcase}
        tooltip={t('opportunitiesTooltip')}
        accentColor="blue"
        isLoading={isLoading}
      />
      <KPICard
        title={t('proposalsSent')}
        mainValue={data?.proposalsSent ?? 0}
        trend={data?.proposalsTrend}
        icon={FileText}
        tooltip={t('proposalsSentTooltip')}
        accentColor="primary"
        isLoading={isLoading}
      />
      <KPICard
        title={t('proposalsPending')}
        mainValue={data?.proposalsPending ?? 0}
        icon={Clock}
        tooltip={t('proposalsPendingTooltip')}
        accentColor="amber"
        isLoading={isLoading}
      />
      <KPICard
        title={t('revenueForecastKPI')}
        mainValue={formatCurrency(data?.revenueForecast ?? 0)}
        trend={data?.revenueTrend}
        icon={TrendingUp}
        tooltip={t('revenueForecastTooltip')}
        accentColor="emerald"
        isLoading={isLoading}
      />
    </div>
  );
}

export type { KPIData };
