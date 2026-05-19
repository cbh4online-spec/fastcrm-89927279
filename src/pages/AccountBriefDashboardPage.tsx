import { useNavigate, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAccountBriefDashboard } from "@/hooks/useAccountBriefDashboard";
import { useAccountBriefOnboarding } from "@/hooks/useAccountBriefOnboarding";
import { useAccountBriefWatchlist } from "@/hooks/useAccountBriefWatchlist";
import { useAccountBriefChangeAlerts } from "@/hooks/useAccountBriefChangeAlerts";
import { useAccountBriefSegments } from "@/hooks/useAccountBriefSegments";
import { useAccountBriefUsage } from "@/hooks/useAccountBriefUsage";
import { useAccountBriefNotifications } from "@/hooks/useAccountBriefNotifications";
import { useAccountBriefDedupe } from "@/hooks/useAccountBriefDedupe";
import {
  Briefcase, Plus, Star, TrendingUp, BarChart3, Loader2, ArrowRight,
  Eye, Bell, Layers, GitCompareArrows, AlertCircle, Gauge, AlertTriangle, Copy,
} from "lucide-react";

const scoreColor = (label: string) => {
  switch (label) {
    case "Muito Alto": return "bg-emerald-500/15 text-emerald-600 border-emerald-200";
    case "Alto": return "bg-blue-500/15 text-blue-600 border-blue-200";
    case "Médio": return "bg-amber-500/15 text-amber-600 border-amber-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

export default function AccountBriefDashboardPage() {
  const navigate = useNavigate();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useAccountBriefOnboarding();
  const { data: dashboard, isLoading } = useAccountBriefDashboard();
  const { activeCount: watchlistCount } = useAccountBriefWatchlist();
  const { unreadCount: alertsCount } = useAccountBriefChangeAlerts();
  const { segments } = useAccountBriefSegments();
  const { allMetrics, currentPeriod } = useAccountBriefUsage();
  const { unreadCount: notifCount } = useAccountBriefNotifications();
  const { pendingCount: dupeCount } = useAccountBriefDedupe();

  if (onboardingLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/dashboard/account-brief/onboarding" replace />;
  }

  const unanalyzedCount = dashboard?.accounts?.filter(a => !a.last_analysis_at).length || 0;
  const analyzedCount = dashboard?.recent?.filter(a => a.last_analysis_at).length || 0;
  const totalAlerts = dupeCount + notifCount + alertsCount;

  // Primary KPIs (4) — métricas mais importantes para o dia-a-dia
  const primaryKpis = [
    { label: "Total Contas", value: dashboard?.totalAccounts || 0, icon: Briefcase, accent: "text-indigo-600", bg: "bg-indigo-500/10", onClick: () => navigate("/dashboard/account-brief/accounts") },
    { label: "Score Alto+", value: dashboard?.highScoreCount || 0, icon: TrendingUp, accent: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Analisadas", value: analyzedCount, icon: BarChart3, accent: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Sem Análise", value: unanalyzedCount, icon: AlertCircle, accent: "text-orange-600", bg: "bg-orange-500/10" },
  ];

  // Secondary chips — informação operacional, mais leve
  const secondaryStats = [
    { label: "Favoritas", value: dashboard?.favorites?.length || 0, icon: Star, onClick: () => navigate("/dashboard/account-brief/accounts") },
    { label: "Watchlist", value: watchlistCount, icon: Eye, onClick: () => navigate("/dashboard/account-brief/watchlist") },
    { label: "Alertas", value: alertsCount, icon: Bell, onClick: () => navigate("/dashboard/account-brief/alerts") },
    { label: "Segmentos", value: segments.length, icon: Layers, onClick: () => navigate("/dashboard/account-brief/segments") },
  ];

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-8 max-w-7xl">
          <PageHeader
            title="Account Brief"
            description="Inteligência comercial B2B — briefings acionáveis para prospeção"
            actions={[
              {
                label: "Adicionar Conta",
                icon: <Plus className="w-4 h-4" />,
                onClick: () => navigate("/dashboard/account-brief/accounts"),
              },
            ]}
          />

          {/* Banda de alertas no topo — só aparece se houver algo a tratar */}
          {totalAlerts > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/10 dark:border-amber-900/40">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {totalAlerts} {totalAlerts === 1 ? "item requer" : "itens requerem"} a tua atenção
              </span>
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {dupeCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-background">
                    <Copy className="w-3 h-3" /> {dupeCount} duplicados
                  </Badge>
                )}
                {notifCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-background">
                    <Bell className="w-3 h-3" /> {notifCount} notificações
                  </Badge>
                )}
                {alertsCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-background">
                    <AlertCircle className="w-3 h-3" /> {alertsCount} alterações
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* SECÇÃO 1 — Visão geral */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Visão geral
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {primaryKpis.map((k) => (
                <Card
                  key={k.label}
                  className={`border-border/60 ${k.onClick ? "cursor-pointer hover:border-border hover:shadow-sm transition-all" : ""}`}
                  onClick={k.onClick}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                        <p className="text-2xl font-semibold mt-1 tabular-nums">{k.value}</p>
                      </div>
                      <div className={`p-2 rounded-md ${k.bg}`}>
                        <k.icon className={`w-4 h-4 ${k.accent}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats secundárias como chips compactos */}
            <div className="flex flex-wrap gap-2 pt-1">
              {secondaryStats.map((s) => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/60 bg-card hover:bg-muted/50 transition-colors text-sm"
                >
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                </button>
              ))}
            </div>
          </section>

          {/* SECÇÃO 2 — Conteúdo principal em 2 colunas */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top scored — 2/3 da largura */}
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Contas com melhor score</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Prioridades para a tua próxima abordagem</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/account-brief/accounts")}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  Ver todas <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : dashboard?.topScored?.length ? (
                  <div className="divide-y divide-border/60">
                    {dashboard.topScored.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between py-3 px-1 -mx-1 rounded-md hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/dashboard/account-brief/accounts/${account.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {account.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{account.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{account.domain || "—"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${scoreColor(account.score_label)}`}>
                          <span className="tabular-nums font-semibold">{account.total_score}</span>
                          <span className="mx-1.5 opacity-50">·</span>
                          <span>{account.score_label}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Ainda sem contas analisadas.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate("/dashboard/account-brief/accounts")}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar contas
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações rápidas + atalhos — 1/3 da largura */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ações rápidas</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Atalhos para fluxos comuns</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickAction
                  icon={GitCompareArrows}
                  label="Comparar Contas"
                  description="Analisa lado a lado"
                  onClick={() => navigate("/dashboard/account-brief/compare")}
                />
                <QuickAction
                  icon={Layers}
                  label="Ver Segmentos"
                  description={`${segments.length} segmentos ativos`}
                  onClick={() => navigate("/dashboard/account-brief/segments")}
                />
                <QuickAction
                  icon={Eye}
                  label="Watchlist"
                  description={`${watchlistCount} em monitorização`}
                  onClick={() => navigate("/dashboard/account-brief/watchlist")}
                />
                <QuickAction
                  icon={Bell}
                  label="Notificações"
                  description={notifCount > 0 ? `${notifCount} por ler` : "Tudo em dia"}
                  onClick={() => navigate("/dashboard/account-brief/notifications")}
                />
              </CardContent>
            </Card>
          </section>

          {/* SECÇÃO 3 — Consumo (movido para o fim, informação de gestão) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Consumo do mês
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Período: {currentPeriod}</p>
              </div>
              <Gauge className="w-4 h-4 text-muted-foreground" />
            </div>
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {allMetrics.slice(0, 6).map((m) => {
                    const unlimited = m.units_limit >= 99999;
                    const statusColor =
                      m.status === "blocked" ? "text-destructive" :
                      m.status === "danger" ? "text-orange-600" :
                      m.status === "warning" ? "text-amber-600" : "text-foreground";
                    return (
                      <div key={m.metric_key} className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-muted-foreground truncate">{m.label}</span>
                          <span className={`font-medium tabular-nums ${statusColor}`}>
                            {unlimited ? `${m.units_used} / ∞` : `${m.units_used} / ${m.units_limit}`}
                          </span>
                        </div>
                        <Progress value={unlimited ? 0 : m.percentage} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}

function QuickAction({
  icon: Icon, label, description, onClick,
}: { icon: any; label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="p-2 rounded-md bg-muted/60 group-hover:bg-background transition-colors">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
