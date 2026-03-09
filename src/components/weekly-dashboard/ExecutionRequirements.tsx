import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Users, Calendar, FileText, Handshake, ArrowDown, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  isLoading: boolean;
}

// Default conversion ratios (can be overridden by workspace data later)
const CONVERSION_RATIOS = {
  lead_to_meeting: 0.4,    // 40% of leads become meetings
  meeting_to_proposal: 0.5, // 50% of meetings generate proposals
  proposal_to_deal: 0.3,    // 30% of proposals convert to deals
};

const metricConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  leads: { label: "Leads Qualificados", icon: <Users className="h-3.5 w-3.5" /> },
  meetings: { label: "Reuniões", icon: <Calendar className="h-3.5 w-3.5" /> },
  proposals: { label: "Propostas", icon: <FileText className="h-3.5 w-3.5" /> },
  deals: { label: "Deals Fechados", icon: <Handshake className="h-3.5 w-3.5" /> },
};

const order = ["leads", "meetings", "proposals", "deals"];

export function ExecutionRequirements({ metrics, pipelineValue, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-4 w-48 mb-3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get revenue gap for reverse engineering
  const revenueMetric = metrics.find((m) => m.key === "revenue");
  const revenueTarget = revenueMetric?.target ?? 0;
  const revenueClosed = revenueMetric?.actual ?? 0;
  const revenueGap = Math.max(revenueTarget - revenueClosed, 0);

  // Calculate average deal value from targets
  const dealsMetric = metrics.find((m) => m.key === "deals");
  const dealsTarget = dealsMetric?.target ?? 1;
  const avgDealValue = dealsTarget > 0 && revenueTarget > 0 ? revenueTarget / dealsTarget : 0;

  // Reverse-engineer from gap
  const dealsNeeded = avgDealValue > 0 ? Math.ceil(revenueGap / avgDealValue) : 0;
  const proposalsNeeded = Math.ceil(dealsNeeded / CONVERSION_RATIOS.proposal_to_deal);
  const meetingsNeeded = Math.ceil(proposalsNeeded / CONVERSION_RATIOS.meeting_to_proposal);
  const leadsNeeded = Math.ceil(meetingsNeeded / CONVERSION_RATIOS.lead_to_meeting);

  const gapRequirements: Record<string, number> = {
    leads: leadsNeeded,
    meetings: meetingsNeeded,
    proposals: proposalsNeeded,
    deals: dealsNeeded,
  };

  const items = order
    .map((key) => {
      const m = metrics.find((x) => x.key === key);
      if (!m) return null;
      const remaining = Math.max(m.target - m.actual, 0);
      const done = m.target > 0 && remaining === 0;
      const gapBased = gapRequirements[key] ?? 0;
      return { ...m, remaining, done, gapBased, config: metricConfig[key] };
    })
    .filter(Boolean) as Array<WeeklyMetric & { remaining: number; done: boolean; gapBased: number; config: { label: string; icon: React.ReactNode } }>;

  const hasGap = revenueGap > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            O que falta esta semana
          </CardTitle>
          {hasGap && (
            <span className="text-[10px] text-muted-foreground">
              Gap de {formatCurrency(revenueGap)} → estimativa baseada em conversão
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gap-based requirements banner */}
        {hasGap && avgDealValue > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para atingir a meta semanal, o sistema estima que precisa de:
              <span className="font-semibold text-foreground"> +{leadsNeeded} leads</span>,
              <span className="font-semibold text-foreground"> +{meetingsNeeded} reuniões</span>,
              <span className="font-semibold text-foreground"> +{proposalsNeeded} propostas</span> e
              <span className="font-semibold text-foreground"> +{dealsNeeded} deals</span> adicionais.
            </p>
          </div>
        )}

        {/* Metric grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {item.config.icon}
                <span className="text-xs font-medium">{item.config.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <span className={cn(
                    "text-lg font-bold",
                    item.status === "red" ? "text-destructive" : item.status === "yellow" ? "text-warning" : "text-success"
                  )}>
                    {item.remaining}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {item.done ? "Concluído" : `faltam (${item.actual}/${item.target})`}
                </span>
              </div>
              {hasGap && item.gapBased > 0 && !item.done && (
                <div className="flex items-center gap-1 text-[10px] text-primary">
                  <ArrowDown className="h-2.5 w-2.5" />
                  <span>+{item.gapBased} estimados pelo gap</span>
                </div>
              )}
              {item.target > 0 && (
                <Progress
                  value={Math.min(item.pct, 100)}
                  className={cn(
                    "h-1.5",
                    item.status === "green" && "[&>div]:bg-success",
                    item.status === "yellow" && "[&>div]:bg-warning",
                    item.status === "red" && "[&>div]:bg-destructive"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
