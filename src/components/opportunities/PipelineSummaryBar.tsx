import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Opportunity } from "@/types/opportunity";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  Clock,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface PipelineSummaryBarProps {
  opportunities: Opportunity[];
  stages: PipelineStage[];
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M €`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K €`;
  }
  return `${value.toLocaleString("pt-PT")} €`;
}

export function PipelineSummaryBar({ opportunities, stages, className }: PipelineSummaryBarProps) {
  const { t } = useTranslation('crm');

  const stats = useMemo(() => {
    const openOpps = opportunities.filter(o => o.status === "open");
    const total = openOpps.length;
    const totalValue = openOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);
    
    const weightedValue = openOpps.reduce((sum, o) => {
      const stage = stages.find(s => s.id === o.stage_id);
      const probability = (stage as any)?.probability || 50;
      return sum + (Number(o.value || 0) * probability / 100);
    }, 0);
    
    const wonOpps = opportunities.filter(o => o.status === "won");
    const avgCycle = wonOpps.length > 0
      ? wonOpps.reduce((sum, o) => {
          const days = differenceInDays(new Date(o.updated_at), new Date(o.created_at));
          return sum + days;
        }, 0) / wonOpps.length
      : 0;
    
    const closedOpps = opportunities.filter(o => o.status === "won" || o.status === "lost");
    const winRate = closedOpps.length > 0 
      ? (wonOpps.length / closedOpps.length) * 100 
      : 0;
    
    return { total, totalValue, weightedValue, avgCycle, winRate, wonCount: wonOpps.length };
  }, [opportunities, stages]);

  const metrics = [
    {
      label: t('pipelineActiveDeals'),
      value: stats.total.toString(),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t('pipelineTotalValue'),
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: t('pipelineWeightedValue'),
      value: formatCurrency(stats.weightedValue),
      sublabel: t('pipelineWeightedSublabel'),
      icon: TrendingUp,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: t('pipelineAvgCycle'),
      value: stats.avgCycle > 0 ? t('pipelineAvgCycleDays', { days: Math.round(stats.avgCycle) }) : "—",
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: t('pipelineConversionRate'),
      value: stats.winRate > 0 ? `${stats.winRate.toFixed(0)}%` : "—",
      sublabel: stats.wonCount > 0 ? t('pipelineWonCount', { count: stats.wonCount }) : undefined,
      icon: BarChart3,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/50", className)}>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                <metric.icon className={cn("w-5 h-5", metric.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground truncate">
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {metric.label}
                </p>
                {metric.sublabel && (
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    {metric.sublabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
