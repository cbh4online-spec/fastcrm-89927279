import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Users, Calendar, FileText, Handshake, ArrowDown, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  isLoading: boolean;
}

/**
 * Default conversion ratios for the execution funnel.
 * These can be overridden by workspace settings in the future.
 * 
 * - lead_to_meeting: 40% — percentage of qualified leads that convert to meetings
 * - meeting_to_proposal: 50% — percentage of meetings that generate a proposal
 * - proposal_to_deal: 30% — percentage of proposals that close as won deals
 */
export const CONVERSION_RATIOS = {
  lead_to_meeting: 0.4,
  meeting_to_proposal: 0.5,
  proposal_to_deal: 0.3,
};

const order = ["leads", "meetings", "proposals", "deals"];

export function ExecutionRequirements({ metrics, pipelineValue, isLoading }: Props) {
  const { t } = useTranslation("dashboard");

  const metricConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    leads: { label: t("qualifiedLeads"), icon: <Users className="h-3.5 w-3.5" /> },
    meetings: { label: t("meetingsLabel"), icon: <Calendar className="h-3.5 w-3.5" /> },
    proposals: { label: t("proposalsLabel"), icon: <FileText className="h-3.5 w-3.5" /> },
    deals: { label: t("dealsLabel"), icon: <Handshake className="h-3.5 w-3.5" /> },
  };

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
            {t("weeklyRemainingTitle")}
          </CardTitle>
          {hasGap && (
            <span className="text-[10px] text-muted-foreground">
              {t("revenueGapLabel", { value: formatCurrency(revenueGap) })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gap-based requirements banner */}
        {hasGap && avgDealValue > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              {t("targetGoalBanner")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-md bg-background/60">
                <p className="text-xl font-bold text-foreground">+{leadsNeeded}</p>
                <p className="text-[10px] text-muted-foreground">{t("leadsLabel")}</p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/60">
                <p className="text-xl font-bold text-foreground">+{meetingsNeeded}</p>
                <p className="text-[10px] text-muted-foreground">{t("meetingsLabel")}</p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/60">
                <p className="text-xl font-bold text-foreground">+{proposalsNeeded}</p>
                <p className="text-[10px] text-muted-foreground">{t("proposalsLabel")}</p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/60">
                <p className="text-xl font-bold text-foreground">+{dealsNeeded}</p>
                <p className="text-[10px] text-muted-foreground">{t("dealsLabel")}</p>
              </div>
            </div>
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
                  {item.done ? t("completed") : t("remaining", { actual: item.actual, target: item.target })}
                </span>
              </div>
              {hasGap && item.gapBased > 0 && !item.done && (
                <div className="flex items-center gap-1 text-[10px] text-primary">
                  <ArrowDown className="h-2.5 w-2.5" />
                  <span>{t("gapEstimate", { count: item.gapBased })}</span>
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
