import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefDashboard } from "@/hooks/useAccountBriefDashboard";
import { useAccountBriefOnboarding } from "@/hooks/useAccountBriefOnboarding";
import { useAccountBriefWatchlist } from "@/hooks/useAccountBriefWatchlist";
import { useAccountBriefChangeAlerts } from "@/hooks/useAccountBriefChangeAlerts";
import { useAccountBriefSegments } from "@/hooks/useAccountBriefSegments";
import { Briefcase, Plus, Star, TrendingUp, BarChart3, Loader2, ArrowRight, Eye, Bell, Layers, GitCompareArrows, AlertCircle, Clock } from "lucide-react";
import { Navigate } from "react-router-dom";

const scoreColor = (label: string) => {
  switch (label) {
    case "Muito Alto": return "bg-emerald-500/20 text-emerald-500";
    case "Alto": return "bg-blue-500/20 text-blue-500";
    case "Médio": return "bg-amber-500/20 text-amber-500";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function AccountBriefDashboardPage() {
  const navigate = useNavigate();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useAccountBriefOnboarding();
  const { data: dashboard, isLoading } = useAccountBriefDashboard();
  const { activeCount: watchlistCount } = useAccountBriefWatchlist();
  const { unreadCount: alertsCount } = useAccountBriefChangeAlerts();
  const { segments } = useAccountBriefSegments();

  if (onboardingLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/dashboard/account-brief/onboarding" replace />;
  }

  const unanalyzedCount = dashboard?.accounts?.filter(a => !a.last_analysis_at).length || 0;

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Account Brief"
            description="Inteligência comercial B2B — briefings acionáveis para prospeção"
            actions={[
              { label: "Adicionar Conta", icon: <Plus className="w-4 h-4" />, onClick: () => navigate("/dashboard/account-brief/accounts") },
            ]}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <KpiCard label="Total Contas" value={dashboard?.totalAccounts || 0} icon={Briefcase} color="indigo" onClick={() => navigate("/dashboard/account-brief/accounts")} />
            <KpiCard label="Score Alto+" value={dashboard?.highScoreCount || 0} icon={TrendingUp} color="emerald" />
            <KpiCard label="Favoritas" value={dashboard?.favorites?.length || 0} icon={Star} color="amber" />
            <KpiCard label="Analisadas" value={dashboard?.recent?.filter(a => a.last_analysis_at).length || 0} icon={BarChart3} color="blue" />
            <KpiCard label="Watchlist" value={watchlistCount} icon={Eye} color="purple" onClick={() => navigate("/dashboard/account-brief/watchlist")} />
            <KpiCard label="Alertas" value={alertsCount} icon={Bell} color="rose" onClick={() => navigate("/dashboard/account-brief/alerts")} />
            <KpiCard label="Segmentos" value={segments.length} icon={Layers} color="teal" onClick={() => navigate("/dashboard/account-brief/segments")} />
            <KpiCard label="Sem Análise" value={unanalyzedCount} icon={AlertCircle} color="orange" />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/account-brief/compare")} className="gap-1.5">
              <GitCompareArrows className="w-3.5 h-3.5" /> Comparar Contas
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/account-brief/segments")} className="gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Ver Segmentos
            </Button>
          </div>

          {/* Top Scored */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Contas com melhor score</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/account-brief/accounts")} className="gap-1">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : dashboard?.topScored?.length ? (
                <div className="space-y-3">
                  {dashboard.topScored.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/account-brief/accounts/${account.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {account.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.domain}</p>
                        </div>
                      </div>
                      <Badge className={scoreColor(account.score_label)}>
                        {account.total_score} — {account.score_label}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ainda sem contas analisadas.</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/account-brief/accounts")}>
                    Adicionar contas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}

function KpiCard({ label, value, icon: Icon, color, onClick }: { label: string; value: number; icon: any; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500/20 text-indigo-500",
    emerald: "bg-emerald-500/20 text-emerald-500",
    amber: "bg-amber-500/20 text-amber-500",
    blue: "bg-blue-500/20 text-blue-500",
    purple: "bg-purple-500/20 text-purple-500",
    rose: "bg-rose-500/20 text-rose-500",
    teal: "bg-teal-500/20 text-teal-500",
    orange: "bg-orange-500/20 text-orange-500",
  };
  return (
    <Card className={`border-0 shadow-lg bg-gradient-to-br from-card to-card/95 ${onClick ? "cursor-pointer hover:shadow-xl transition-shadow" : ""}`} onClick={onClick}>
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.indigo}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
