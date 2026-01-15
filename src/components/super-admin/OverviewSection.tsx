import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Brain,
  Clock,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface OverviewStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  trialWorkspaces: number;
  pastDueWorkspaces: number;
  canceledWorkspaces: number;
  suspendedWorkspaces: number;
  mrr: number;
  totalUsers: number;
  avgAiUsage: number;
  nearLimitWorkspaces: number;
}

interface CriticalAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  workspace_name?: string;
  created_at: string;
}

export function OverviewSection() {
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: async () => {
      // Fetch workspaces with subscriptions
      const { data: workspaces, error: wsError } = await supabase
        .from("workspaces")
        .select(`
          id,
          status,
          workspace_subscriptions (
            plan,
            status,
            current_period_end
          ),
          workspace_usage (
            ai_calls_used
          )
        `);

      if (wsError) throw wsError;

      // Fetch total users
      const { count: userCount } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true });

      // Calculate stats
      const total = workspaces?.length || 0;
      const active = workspaces?.filter((w: any) => 
        w.workspace_subscriptions?.[0]?.status === "active"
      ).length || 0;
      const trial = workspaces?.filter((w: any) => 
        w.workspace_subscriptions?.[0]?.status === "trialing"
      ).length || 0;
      const pastDue = workspaces?.filter((w: any) => 
        w.workspace_subscriptions?.[0]?.status === "past_due"
      ).length || 0;
      const canceled = workspaces?.filter((w: any) => 
        w.workspace_subscriptions?.[0]?.status === "canceled"
      ).length || 0;
      const suspended = workspaces?.filter((w: any) => 
        w.status === "suspended"
      ).length || 0;

      // Calculate MRR (simplified - would need price data in production)
      const planPrices: Record<string, number> = {
        free: 0,
        basic: 29,
        pro: 79,
        agency: 199,
      };
      const mrr = workspaces?.reduce((acc: number, w: any) => {
        const plan = w.workspace_subscriptions?.[0]?.plan || "free";
        const status = w.workspace_subscriptions?.[0]?.status;
        if (status === "active" || status === "trialing") {
          return acc + (planPrices[plan] || 0);
        }
        return acc;
      }, 0) || 0;

      // Calculate avg AI usage
      const totalAi = workspaces?.reduce((acc: number, w: any) => 
        acc + (w.workspace_usage?.[0]?.ai_calls_used || 0), 0) || 0;
      const avgAi = total > 0 ? Math.round(totalAi / total) : 0;

      return {
        totalWorkspaces: total,
        activeWorkspaces: active,
        trialWorkspaces: trial,
        pastDueWorkspaces: pastDue,
        canceledWorkspaces: canceled,
        suspendedWorkspaces: suspended,
        mrr,
        totalUsers: userCount || 0,
        avgAiUsage: avgAi,
        nearLimitWorkspaces: 0, // Would need quota calculation
      } as OverviewStats;
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["super-admin-critical-alerts"],
    queryFn: async () => {
      // Fetch critical billing events
      const { data: billingEvents } = await supabase
        .from("billing_events")
        .select(`
          id,
          event_type,
          created_at,
          workspace_id,
          workspaces (name)
        `)
        .in("event_type", ["invoice.payment_failed", "subscription.past_due"])
        .eq("processed", false)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch open incidents
      const { data: incidents } = await supabase
        .from("system_incidents")
        .select(`
          id,
          incident_type,
          severity,
          title,
          created_at,
          workspace_id,
          workspaces (name)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      const alerts: CriticalAlert[] = [];

      billingEvents?.forEach((e: any) => {
        alerts.push({
          id: e.id,
          type: "billing",
          severity: "high",
          title: e.event_type === "invoice.payment_failed" 
            ? "Pagamento falhado" 
            : "Subscrição em atraso",
          workspace_name: e.workspaces?.name,
          created_at: e.created_at,
        });
      });

      incidents?.forEach((i: any) => {
        alerts.push({
          id: i.id,
          type: "incident",
          severity: i.severity,
          title: i.title,
          workspace_name: i.workspaces?.name,
          created_at: i.created_at,
        });
      });

      return alerts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      case "medium": return "bg-info text-info-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview SaaS</h1>
          <p className="text-muted-foreground">Estado global do SaaS em tempo real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workspaces</p>
                <p className="text-3xl font-bold">{stats?.totalWorkspaces}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold text-success">{stats?.activeWorkspaces}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trials</p>
                <p className="text-3xl font-bold text-info">{stats?.trialWorkspaces}</p>
              </div>
              <Clock className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-3xl font-bold">€{stats?.mrr}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilizadores</p>
                <p className="text-3xl font-bold">{stats?.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Past Due</p>
                <p className="text-3xl font-bold text-warning">{stats?.pastDueWorkspaces}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p className="text-3xl font-bold text-destructive">{stats?.canceledWorkspaces}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média IA/Workspace</p>
                <p className="text-3xl font-bold">{stats?.avgAiUsage}</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas Críticos
              </CardTitle>
              <CardDescription>
                Situações que requerem atenção imediata
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.workspace_name && (
                        <p className="text-xs text-muted-foreground">
                          {alert.workspace_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), "dd MMM, HH:mm", { locale: pt })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sem alertas críticos</p>
              <p className="text-sm">Tudo a funcionar normalmente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Estado das Subscrições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativos</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full"
                      style={{ 
                        width: `${stats?.totalWorkspaces ? (stats.activeWorkspaces / stats.totalWorkspaces) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{stats?.activeWorkspaces}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Em trial</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-info rounded-full"
                      style={{ 
                        width: `${stats?.totalWorkspaces ? (stats.trialWorkspaces / stats.totalWorkspaces) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{stats?.trialWorkspaces}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Past due</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full"
                      style={{ 
                        width: `${stats?.totalWorkspaces ? (stats.pastDueWorkspaces / stats.totalWorkspaces) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{stats?.pastDueWorkspaces}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cancelados</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive rounded-full"
                      style={{ 
                        width: `${stats?.totalWorkspaces ? (stats.canceledWorkspaces / stats.totalWorkspaces) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{stats?.canceledWorkspaces}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-sm font-medium">Workspaces suspensos</span>
                <Badge variant="outline" className="border-success text-success">
                  {stats?.suspendedWorkspaces}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <span className="text-sm font-medium">Perto do limite</span>
                <Badge variant="outline" className="border-warning text-warning">
                  {stats?.nearLimitWorkspaces}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-info/10 border border-info/20">
                <span className="text-sm font-medium">Uso médio IA</span>
                <Badge variant="outline" className="border-info text-info">
                  {stats?.avgAiUsage} calls
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
