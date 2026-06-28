import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePerformanceScores, useLeaderboard, useRecalculateScores } from "@/hooks/usePerformanceScores";
import { usePerformanceChallenges } from "@/hooks/usePerformanceChallenges";
import { usePerformanceRecognition, RECOGNITION_TYPES } from "@/hooks/usePerformanceRecognition";
import { usePerformanceGoals } from "@/hooks/usePerformanceGoals";
import { TrendingUp, Target, Trophy, Zap, Users, DollarSign, Calendar, RefreshCw, BarChart3 } from "lucide-react";
import { MetricWidgets } from "@/components/metrics/MetricWidgets";
import { useSeedDefaultMetrics } from "@/hooks/useSeedDefaultMetrics";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KpiProps { label: string; value: string | number; icon: React.ReactNode; tone?: "default" | "success" | "primary" | "warning"; }
function IXKpi({ label, value, icon, tone = "default" }: KpiProps) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", tones[tone])}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}


const RECALC_KEY = "perf_last_recalc";
const RECALC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function PerformanceDashboardPage() {
  const { t } = useTranslation("performance");
  useSeedDefaultMetrics();
  const navigate = useNavigate();
  const { data: scores, isLoading: scoresLoading } = usePerformanceScores("weekly");
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard("score_total", "weekly");
  const { data: challenges } = usePerformanceChallenges("active");
  const { data: recognitions } = usePerformanceRecognition(5);
  const { data: goals } = usePerformanceGoals();
  const recalculate = useRecalculateScores();

  // Auto-recalculate when scores are empty/zero or stale (>5min)
  useEffect(() => {
    if (scoresLoading || recalculate.isPending) return;
    const lastRecalc = sessionStorage.getItem(RECALC_KEY);
    const now = Date.now();
    if (lastRecalc && now - Number(lastRecalc) < RECALC_INTERVAL_MS) return;

    const allZero = !scores?.length || scores.every(s => s.score_total === 0 && s.revenue_generated === 0);
    const isStale = !lastRecalc || now - Number(lastRecalc) >= RECALC_INTERVAL_MS;

    if (allZero || isStale) {
      sessionStorage.setItem(RECALC_KEY, String(now));
      recalculate.mutate("weekly");
    }
  }, [scoresLoading, scores]);

  const getChallengeProgress = (ch: any) => {
    if (!scores?.length || !ch.target_value) return 0;
    const metricKey = ch.metric_type as string;
    let totalValue = 0;
    for (const sc of scores) {
      if (metricKey === "revenue") totalValue += sc.revenue_generated;
      else if (metricKey === "pipeline") totalValue += sc.pipeline_generated;
      else if (metricKey === "meetings") totalValue += sc.meetings_booked;
      else if (metricKey === "proposals") totalValue += sc.proposals_sent;
      else if (metricKey === "leads") totalValue += sc.leads_generated;
      else totalValue += sc.score_total;
    }
    return Math.min(Math.round((totalValue / ch.target_value) * 100), 100);
  };

  const getGoalProgress = (g: any) => {
    if (!scores?.length || !g.target_value) return 0;
    const goalType = g.goal_type as string;
    let totalValue = 0;
    for (const sc of scores) {
      if (goalType === "revenue") totalValue += sc.revenue_generated;
      else if (goalType === "pipeline") totalValue += sc.pipeline_generated;
      else if (goalType === "meetings") totalValue += sc.meetings_booked;
      else if (goalType === "proposals") totalValue += sc.proposals_sent;
      else if (goalType === "leads") totalValue += sc.leads_generated;
      else totalValue += sc.score_total;
    }
    return Math.min(Math.round((totalValue / g.target_value) * 100), 100);
  };

  const totalRevenue = scores?.reduce((s, sc) => s + sc.revenue_generated, 0) || 0;
  const totalPipeline = scores?.reduce((s, sc) => s + sc.pipeline_generated, 0) || 0;
  const totalMeetings = scores?.reduce((s, sc) => s + sc.meetings_booked, 0) || 0;
  const totalDeals = scores?.length || 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => recalculate.mutate("weekly")}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
            {t("recalculate")}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <IXKpi label={t("closedRevenue")} value={formatCurrency(totalRevenue)} icon={<DollarSign className="h-4 w-4" />} />
          <IXKpi label={t("pipelineGenerated")} value={formatCurrency(totalPipeline)} icon={<TrendingUp className="h-4 w-4" />} />
          <IXKpi label={t("meetingsHeld")} value={totalMeetings} icon={<Calendar className="h-4 w-4" />} />
          <IXKpi label={t("activePerformers")} value={totalDeals} icon={<Users className="h-4 w-4" />} />
        </div>

        {/* Pipeline Metrics Widgets */}
        <MetricWidgets />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => navigate("/dashboard/performance/metrics")}>
            <BarChart3 className="h-4 w-4" />
            Gerir Métricas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IXCard
            className="lg:col-span-2"
            title={t("weeklyLeaderboard")}
            actions={
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard/performance/leaderboard")}>
                {t("viewAll")}
              </Button>
            }
          >
            {lbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : !leaderboard?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("noPerformanceData")} {t("noPerformanceDataHint")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {leaderboard.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                      entry.rank === 1 ? "bg-yellow-500/15 text-yellow-600" :
                      entry.rank === 2 ? "bg-gray-300/30 text-gray-600" :
                      entry.rank === 3 ? "bg-orange-400/15 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {entry.rank}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback>{entry.user_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(entry.revenue_generated)} {t("revenue")} · {entry.meetings_booked} {t("meetings")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{Math.round(entry.score_total)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("points")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </IXCard>

          <IXCard
            title={t("activeChallenges")}
            actions={
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard/performance/challenges")}>
                {t("viewAll")}
              </Button>
            }
          >
            {!challenges?.length ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t("noChallenges")}</p>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/dashboard/performance/challenges")}>
                  {t("createChallenge")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {challenges.slice(0, 3).map(ch => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(ch.end_date).getTime() - Date.now()) / 86400000));
                  return (
                    <div key={ch.id} className="p-3 rounded-xl border border-border/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{ch.challenge_name}</p>
                        <Badge variant="secondary" className="text-[10px] rounded-full shrink-0">{t("daysRemaining", { count: daysLeft })}</Badge>
                      </div>
                      {ch.description && <p className="text-xs text-muted-foreground line-clamp-2">{ch.description}</p>}
                      <Progress value={getChallengeProgress(ch)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </IXCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IXCard
            title={t("activeGoals")}
            actions={
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard/performance/metrics")}>
                {t("manage")}
              </Button>
            }
          >
            {!goals?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("noGoals")}</p>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 4).map(g => (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{g.goal_name}</span>
                      <span className="text-muted-foreground shrink-0">{g.target_value}</span>
                    </div>
                    <Progress value={getGoalProgress(g)} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </IXCard>

          <IXCard
            title={t("recognitions")}
            actions={
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard/performance/recognition")}>
                {t("viewAll")}
              </Button>
            }
          >
            {!recognitions?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("noRecognitions")}</p>
            ) : (
              <div className="divide-y divide-border">
                {recognitions.slice(0, 4).map(r => {
                  const typeInfo = RECOGNITION_TYPES.find(t => t.value === r.recognition_type);
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-lg">{typeInfo?.icon || "🏆"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.user_name || "—"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] rounded-full">{typeInfo?.label || r.recognition_type}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </IXCard>
        </div>
      </div>

    </DashboardLayout>
  );
}
