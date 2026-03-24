import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useSystemFunctionRuns } from "@/hooks/useSystemFunctionRuns";
import { useAccountBriefUsage } from "@/hooks/useAccountBriefUsage";
import { useAccountBriefKPIs } from "@/hooks/useAccountBriefKPIs";
import { useAccountBriefErrorCatalog } from "@/hooks/useAccountBriefErrorCatalog";
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Clock, Loader2,
  RefreshCw, Server, Gauge, Shield, BarChart3, Bug
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  if (status === "ok" || status === "completed" || status === "success") {
    return <Badge className="bg-emerald-500/20 text-emerald-500 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
  }
  if (status === "warning" || status === "degraded") {
    return <Badge className="bg-amber-500/20 text-amber-500 border-0"><AlertTriangle className="h-3 w-3 mr-1" />Degradado</Badge>;
  }
  if (status === "error" || status === "failed" || status === "critical") {
    return <Badge className="bg-destructive/20 text-destructive border-0"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
  }
  return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
}

export default function AccountBriefHealthPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [runningSmoke, setRunningSmoke] = useState(false);

  // Function runs specific to account-brief
  const { data: abFunctionRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ["ab-function-runs", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("system_function_runs")
        .select("*")
        .eq("workspace_id", wsId)
        .like("function_name", "account-brief%")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  // Job queue stats
  const { data: jobStats = { pending: 0, running: 0, failed: 0, completed: 0 } } = useQuery({
    queryKey: ["ab-job-stats", wsId],
    queryFn: async () => {
      if (!wsId) return { pending: 0, running: 0, failed: 0, completed: 0 };
      const { data, error } = await supabase
        .from("account_brief_job_queue")
        .select("status")
        .eq("workspace_id", wsId);
      if (error) throw error;
      const stats = { pending: 0, running: 0, failed: 0, completed: 0 };
      (data || []).forEach((j: any) => {
        if (j.status === "pending" || j.status === "scheduled") stats.pending++;
        else if (j.status === "running") stats.running++;
        else if (j.status === "failed") stats.failed++;
        else if (j.status === "completed") stats.completed++;
      });
      return stats;
    },
    enabled: !!wsId,
  });

  // Deadletter for AB
  const { data: deadletterCount = 0 } = useQuery({
    queryKey: ["ab-deadletter", wsId],
    queryFn: async () => {
      if (!wsId) return 0;
      const { count, error } = await supabase
        .from("kernel_event_deadletter")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .like("event_type", "account_brief%");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!wsId,
  });

  const { allMetrics } = useAccountBriefUsage();
  const { kpis } = useAccountBriefKPIs();
  const { catalog: errorCatalog } = useAccountBriefErrorCatalog();

  // Recent errors from analysis
  const { data: recentErrors = [] } = useQuery({
    queryKey: ["ab-recent-errors", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("account_brief_analysis_errors")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  // Compute health metrics
  const totalRuns = abFunctionRuns.length;
  const successRuns = abFunctionRuns.filter((r: any) => r.status === "completed" || r.status === "success").length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;
  const avgLatency = totalRuns > 0
    ? Math.round(abFunctionRuns.reduce((s: number, r: any) => s + (r.duration_ms || 0), 0) / totalRuns)
    : 0;

  const overallStatus = successRate >= 95 ? "ok" : successRate >= 80 ? "warning" : "critical";

  const runSmokeTest = async () => {
    setRunningSmoke(true);
    try {
      const { error } = await supabase.functions.invoke("account-brief-smoke-test", {
        body: { workspace_id: wsId },
      });
      if (error) throw error;
      toast.success("Smoke test concluído com sucesso");
    } catch (e: any) {
      toast.error("Smoke test falhou: " + (e.message || "Erro desconhecido"));
    } finally {
      setRunningSmoke(false);
    }
  };

  return (
    <ModuleGuard moduleSlug="account-brief">
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <PageHeader
            title="Saúde do Módulo"
            description="Observabilidade e diagnóstico do Account Brief"
          />

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Estado Geral</span>
                  <StatusBadge status={overallStatus} />
                </div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de sucesso (últimas 50 runs)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Latência Média</span>
                </div>
                <p className="text-2xl font-bold">{avgLatency}ms</p>
                <p className="text-xs text-muted-foreground">Últimas {totalRuns} execuções</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fila de Jobs</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-amber-500">{jobStats.pending} pendentes</span>
                  <span className="text-blue-500">{jobStats.running} a correr</span>
                  <span className="text-destructive">{jobStats.failed} falhados</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Deadletter</span>
                </div>
                <p className="text-2xl font-bold">{deadletterCount}</p>
                <p className="text-xs text-muted-foreground">Eventos não processados</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex gap-3">
            <Button onClick={runSmokeTest} disabled={runningSmoke} variant="outline" size="sm">
              {runningSmoke ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
              Executar Smoke Test
            </Button>
          </div>

          <Tabs defaultValue="runs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="runs">Execuções</TabsTrigger>
              <TabsTrigger value="errors">Erros Recentes</TabsTrigger>
              <TabsTrigger value="quotas">Quotas</TabsTrigger>
              <TabsTrigger value="catalog">Catálogo de Erros</TabsTrigger>
            </TabsList>

            {/* Function Runs */}
            <TabsContent value="runs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Últimas Execuções de Edge Functions</CardTitle>
                </CardHeader>
                <CardContent>
                  {runsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : abFunctionRuns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem execuções registadas.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 px-2">Função</th>
                            <th className="text-left py-2 px-2">Estado</th>
                            <th className="text-right py-2 px-2">Duração</th>
                            <th className="text-right py-2 px-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abFunctionRuns.slice(0, 20).map((run: any) => (
                            <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-2 font-mono text-xs">{run.function_name}</td>
                              <td className="py-2 px-2"><StatusBadge status={run.status} /></td>
                              <td className="py-2 px-2 text-right text-muted-foreground">{run.duration_ms ? `${run.duration_ms}ms` : "—"}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground text-xs">
                                {run.created_at ? format(new Date(run.created_at), "dd/MM HH:mm:ss") : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Errors */}
            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Erros de Análise Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentErrors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem erros recentes. 🎉</p>
                  ) : (
                    <div className="space-y-3">
                      {recentErrors.map((err: any) => (
                        <div key={err.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                          <Bug className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">{err.error_type || "unknown"}</span>
                              <span className="text-xs text-muted-foreground">{err.step_name || ""}</span>
                              {err.retryable && <Badge variant="outline" className="text-[10px] h-4">Retryable</Badge>}
                            </div>
                            <p className="text-sm text-foreground truncate">{err.error_message || "Sem mensagem"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {err.created_at ? format(new Date(err.created_at), "dd/MM/yyyy HH:mm") : "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotas */}
            <TabsContent value="quotas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consumo de Quotas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allMetrics.map((m) => (
                      <div key={m.metric_key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{m.label}</span>
                          <span className="text-muted-foreground">
                            {m.units_used} / {m.units_limit >= 99999 ? "∞" : m.units_limit}
                          </span>
                        </div>
                        <Progress
                          value={m.percentage}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Error Catalog */}
            <TabsContent value="catalog" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Catálogo de Erros</CardTitle>
                </CardHeader>
                <CardContent>
                  {errorCatalog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Catálogo vazio.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 px-2">Código</th>
                            <th className="text-left py-2 px-2">Tipo</th>
                            <th className="text-left py-2 px-2">Severidade</th>
                            <th className="text-left py-2 px-2">Mensagem</th>
                            <th className="text-left py-2 px-2">Ação Sugerida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {errorCatalog.map((e: any) => (
                            <tr key={e.id} className="border-b border-border/50">
                              <td className="py-2 px-2 font-mono text-xs">{e.error_code}</td>
                              <td className="py-2 px-2 text-xs">{e.error_type}</td>
                              <td className="py-2 px-2"><StatusBadge status={e.severity} /></td>
                              <td className="py-2 px-2 text-xs max-w-[200px] truncate">{e.user_message}</td>
                              <td className="py-2 px-2 text-xs text-muted-foreground max-w-[200px] truncate">{e.suggested_action || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
