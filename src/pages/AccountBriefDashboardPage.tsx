import { useNavigate, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IXCard } from "@/components/entity/ix/IXCard";
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
    case "Muito Alto": return "border-border bg-muted text-foreground";
    case "Alto": return "border-border bg-muted text-foreground";
    case "Médio": return "border-border bg-muted text-muted-foreground";
    default: return "border-border bg-muted text-muted-foreground";
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
    { label: "Total Contas", value: dashboard?.totalAccounts || 0, icon: Briefcase, onClick: () => navigate("/dashboard/account-brief/accounts") },
    { label: "Score Alto+", value: dashboard?.highScoreCount || 0, icon: TrendingUp },
    { label: "Analisadas", value: analyzedCount, icon: BarChart3 },
    { label: "Sem Análise", value: unanalyzedCount, icon: AlertCircle },
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
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-border bg-muted/40">
              <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">
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
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Visão geral
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {primaryKpis.map((k) => (
                <button
                  key={k.label}
                  onClick={k.onClick}
                  disabled={!k.onClick}
                  className={`text-left rounded-2xl border border-border bg-card p-5 shadow-sm ${k.onClick ? "hover:border-foreground/20 transition-colors cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{k.label}</p>
                    <div className="p-1.5 rounded-md bg-muted">
                      <k.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-3 tabular-nums">{k.value}</p>
                </button>
              ))}
            </div>

            {/* Stats secundárias como chips compactos */}
            <div className="flex flex-wrap gap-2 pt-1">
              {secondaryStats.map((s) => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/50 transition-colors text-sm"
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
            <IXCard
              className="lg:col-span-2"
              title="Contas com melhor score"
              description="Prioridades para a tua próxima abordagem"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/account-brief/accounts")}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  Ver todas <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              }
            >
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : dashboard?.topScored?.length ? (
                <div className="divide-y divide-border">
                  {dashboard.topScored.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                      onClick={() => navigate(`/dashboard/account-brief/accounts/${account.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground font-semibold text-xs shrink-0">
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
            </IXCard>

            <IXCard title="Ações rápidas" description="Atalhos para fluxos comuns">
              <div className="space-y-2">
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
              </div>
            </IXCard>
          </section>

          {/* SECÇÃO 3 — Consumo */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Consumo do mês
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Período: {currentPeriod}</p>
              </div>
              <Gauge className="w-4 h-4 text-muted-foreground" />
            </div>
            <IXCard>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {allMetrics.slice(0, 6).map((m) => {
                  const unlimited = m.units_limit >= 99999;
                  const statusColor =
                    m.status === "blocked" ? "text-destructive" :
                    m.status === "danger" ? "text-destructive" :
                    m.status === "warning" ? "text-muted-foreground" : "text-foreground";
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
            </IXCard>
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
      <div className="p-2 rounded-md bg-muted">
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
