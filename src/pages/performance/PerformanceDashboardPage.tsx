import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePerformanceScores, useLeaderboard, useRecalculateScores } from "@/hooks/usePerformanceScores";
import { usePerformanceChallenges } from "@/hooks/usePerformanceChallenges";
import { usePerformanceRecognition, RECOGNITION_TYPES } from "@/hooks/usePerformanceRecognition";
import { usePerformanceGoals } from "@/hooks/usePerformanceGoals";
import { TrendingUp, Target, Trophy, Zap, Users, DollarSign, Calendar, BarChart3, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function PerformanceDashboardPage() {
  const navigate = useNavigate();
  const { data: scores, isLoading: scoresLoading } = usePerformanceScores("weekly");
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard("score_total", "weekly");
  const { data: challenges } = usePerformanceChallenges("active");
  const { data: recognitions } = usePerformanceRecognition(5);
  const { data: goals } = usePerformanceGoals();
  const recalculate = useRecalculateScores();

  const totalRevenue = scores?.reduce((s, sc) => s + sc.revenue_generated, 0) || 0;
  const totalPipeline = scores?.reduce((s, sc) => s + sc.pipeline_generated, 0) || 0;
  const totalMeetings = scores?.reduce((s, sc) => s + sc.meetings_booked, 0) || 0;
  const totalDeals = scores?.length || 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Sales Performance Engine"
            description="Desempenho de vendas alinhado com receita"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculate.mutate("weekly")}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>

        {/* Company KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Receita Fechada"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="success"
          />
          <KPICard
            title="Pipeline Gerado"
            value={formatCurrency(totalPipeline)}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="primary"
          />
          <KPICard
            title="Reuniões Realizadas"
            value={totalMeetings}
            icon={<Calendar className="h-4 w-4" />}
            variant="warning"
          />
          <KPICard
            title="Performers Ativos"
            value={totalDeals}
            icon={<Users className="h-4 w-4" />}
            variant="default"
          />
        </KPIGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard Semanal
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/leaderboard")}>
                Ver tudo
              </Button>
            </CardHeader>
            <CardContent>
              {lbLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : !leaderboard?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sem dados de performance. Clica em "Recalcular" para gerar scores.
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
                          {formatCurrency(entry.revenue_generated)} receita · {entry.meetings_booked} reuniões
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{Math.round(entry.score_total)}</p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Challenges */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Desafios Ativos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/challenges")}>
                Ver tudo
              </Button>
            </CardHeader>
            <CardContent>
              {!challenges?.length ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">Nenhum desafio ativo</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/performance/challenges")}>
                    Criar Desafio
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
                          <Badge variant="secondary" className="text-xs">{daysLeft}d restantes</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.description}</p>
                        <Progress value={45} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Metas Ativas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/goals")}>
                Gerir
              </Button>
            </CardHeader>
            <CardContent>
              {!goals?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma meta definida</p>
              ) : (
                <div className="space-y-3">
                  {goals.slice(0, 4).map(g => (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.goal_name}</span>
                        <span className="text-muted-foreground">{g.target_value}</span>
                      </div>
                      <Progress value={35} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Recognitions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Reconhecimentos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/performance/recognition")}>
                Ver tudo
              </Button>
            </CardHeader>
            <CardContent>
              {!recognitions?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sem reconhecimentos ainda</p>
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
