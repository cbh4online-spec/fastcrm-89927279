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
        <div className="flex items-center justify-between">
          <PageHeader
            title={t("title")}
            description={t("description")}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculate.mutate("weekly")}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
            {t("recalculate")}
          </Button>
        </div>

        <KPIGrid columns={4}>
          <KPICard
            title={t("closedRevenue")}
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="success"
          />
          <KPICard
            title={t("pipelineGenerated")}
            value={formatCurrency(totalPipeline)}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="primary"
          />
          <KPICard
            title={t("meetingsHeld")}
            value={totalMeetings}
            icon={<Calendar className="h-4 w-4" />}
            variant="warning"
          />
          <KPICard
            title={t("activePerformers")}
            value={totalDeals}
            icon={<Users className="h-4 w-4" />}
            variant="default"
          />
        </KPIGrid>

        {/* Pipeline Metrics Widgets */}
        <MetricWidgets />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/performance/metrics")}>
            <BarChart3 className="h-4 w-4" />
            Gerir Métricas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("weeklyLeaderboard")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/leaderboard")}>
                {t("viewAll")}
              </Button>
            </CardHeader>
            <CardContent>
              {lbLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : !leaderboard?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t("noPerformanceData")} {t("noPerformanceDataHint")}
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        entry.rank === 1 ? "bg-yellow-500/20 text-yellow-600" :
                        entry.rank === 2 ? "bg-gray-300/30 text-gray-600" :
                        entry.rank === 3 ? "bg-orange-400/20 text-orange-600" :
                        "bg-muted text-muted-foreground"
                      }`}>
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
                        <p className="text-sm font-bold">{Math.round(entry.score_total)}</p>
                        <p className="text-xs text-muted-foreground">{t("points")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t("activeChallenges")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/challenges")}>
                {t("viewAll")}
              </Button>
            </CardHeader>
            <CardContent>
              {!challenges?.length ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">{t("noChallenges")}</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/performance/challenges")}>
                    {t("createChallenge")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges.slice(0, 3).map(ch => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(ch.end_date).getTime() - Date.now()) / 86400000));
                    return (
                      <div key={ch.id} className="p-3 rounded-lg border border-border/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{ch.challenge_name}</p>
                          <Badge variant="secondary" className="text-xs">{t("daysRemaining", { count: daysLeft })}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.description}</p>
                        <Progress value={getChallengeProgress(ch)} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("activeGoals")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/metrics")}>
                {t("manage")}
              </Button>
            </CardHeader>
            <CardContent>
              {!goals?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t("noGoals")}</p>
              ) : (
                <div className="space-y-3">
                  {goals.slice(0, 4).map(g => (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.goal_name}</span>
                        <span className="text-muted-foreground">{g.target_value}</span>
                      </div>
                      <Progress value={getGoalProgress(g)} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("recognitions")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/recognition")}>
                {t("viewAll")}
              </Button>
            </CardHeader>
            <CardContent>
              {!recognitions?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t("noRecognitions")}</p>
              ) : (
                <div className="space-y-3">
                  {recognitions.slice(0, 4).map(r => {
                    const typeInfo = RECOGNITION_TYPES.find(t => t.value === r.recognition_type);
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                        <span className="text-xl">{typeInfo?.icon || "🏆"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.user_name || "—"}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{typeInfo?.label || r.recognition_type}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
