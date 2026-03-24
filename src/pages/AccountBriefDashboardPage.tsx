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
import { Briefcase, Plus, Star, TrendingUp, BarChart3, Loader2, ArrowRight, Eye, Bell } from "lucide-react";
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

  if (onboardingLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/dashboard/account-brief/onboarding" replace />;
  }

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Contas</p>
                    <p className="text-3xl font-bold">{dashboard?.totalAccounts || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-500">
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Score Alto+</p>
                    <p className="text-3xl font-bold">{dashboard?.highScoreCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Favoritas</p>
                    <p className="text-3xl font-bold">{dashboard?.favorites?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500">
                    <Star className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Analisadas</p>
                    <p className="text-3xl font-bold">{dashboard?.recent?.filter(a => a.last_analysis_at).length || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/20 text-blue-500">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-sm">
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
