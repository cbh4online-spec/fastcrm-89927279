import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useSystemFunctionRuns } from "@/hooks/useSystemFunctionRuns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, ShieldCheck, ShieldAlert, ShieldX, FlaskConical, RefreshCw, Clock, AlertTriangle, CheckCircle2, XCircle, Inbox, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

const statusConfig = {
  ok: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "OK" },
  degraded: { icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10", label: "Degraded" },
  down: { icon: ShieldX, color: "text-destructive", bg: "bg-destructive/10", label: "Down" },
};

const smokeStatusConfig = {
  pass: { icon: CheckCircle2, color: "text-emerald-500", label: "Pass" },
  fail: { icon: XCircle, color: "text-destructive", label: "Fail" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
};

export default function SystemHealthPage() {
  const { modules, smokeRuns, smokeFailures, deadletterCount, consumerStatus, healthScore, isLoading, runSmokeTests, recomputeHealth } = useSystemHealth();
  const { data: functionRuns, isLoading: runsLoading } = useSystemFunctionRuns({ limit: 30 });
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="System Health"
          description="Diagnóstico em tempo real de todos os módulos, edge functions e smoke tests"
          actions={[
            {
              label: runSmokeTests.isPending ? "A executar..." : "Run Smoke Tests",
              icon: runSmokeTests.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />,
              onClick: () => runSmokeTests.mutate(),
              disabled: runSmokeTests.isPending,
              variant: "outline",
            },
            {
              label: recomputeHealth.isPending ? "A calcular..." : "Recompute Health",
              icon: recomputeHealth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />,
              onClick: () => recomputeHealth.mutate(),
              disabled: recomputeHealth.isPending,
            },
          ]}
        />

        {/* Health Score Banner + Deadletter + Consumers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthScore !== null && (
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={cn(
                  "flex items-center justify-center h-14 w-14 rounded-xl text-xl font-bold",
                  healthScore >= 95 ? "bg-emerald-500/10 text-emerald-500" :
                  healthScore >= 80 ? "bg-amber-500/10 text-amber-500" :
                  "bg-destructive/10 text-destructive"
                )}>
                  {healthScore}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Health Score</p>
                  <p className="text-xs text-muted-foreground">
                    {modules.length} módulos monitorizados
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deadletter Count */}
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className={cn(
                "flex items-center justify-center h-14 w-14 rounded-xl text-xl font-bold",
                deadletterCount === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              )}>
                {deadletterCount}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Deadletter Queue</p>
                <p className="text-xs text-muted-foreground">
                  Eventos que falharam no processamento
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Consumer Status */}
          <Card className="border-border/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Kernel Consumers</p>
              </div>
              {consumerStatus.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum consumer ativo</p>
              ) : (
                <div className="space-y-1.5">
                  {consumerStatus.map((c: any) => (
                    <div key={`${c.workspace_id}-${c.consumer_id}`} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{c.consumer_id}</span>
                      <span className="text-muted-foreground">
                        {c.last_processed_at
                          ? formatDistanceToNow(new Date(c.last_processed_at), { addSuffix: true, locale: pt })
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Module Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Módulos</h2>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : modules.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Sem dados de health. Execute "Run Smoke Tests" + "Recompute Health".</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => {
                const sc = statusConfig[mod.status as keyof typeof statusConfig] ?? statusConfig.ok;
                const StatusIcon = sc.icon;
                const smk = smokeStatusConfig[mod.smoke_status as keyof typeof smokeStatusConfig] ?? smokeStatusConfig.pending;
                const SmokeIcon = smk.icon;

                return (
                  <Card key={mod.id} className="border-border/50 hover:border-border transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{mod.module_id}</CardTitle>
                        <Badge variant="outline" className={cn("gap-1", sc.color, sc.bg)}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Success Rate</span>
                          <p className="font-mono font-medium">{Number(mod.success_rate).toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P95 Latency</span>
                          <p className="font-mono font-medium">{mod.p95_latency_ms}ms</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failures 24h</span>
                          <p className="font-mono font-medium">{mod.failures_24h}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failures 7d</span>
                          <p className="font-mono font-medium">{mod.failures_7d}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <div className="flex items-center gap-1">
                          <SmokeIcon className={cn("h-3 w-3", smk.color)} />
                          <span className={smk.color}>Smoke: {smk.label}</span>
                        </div>
                        {mod.computed_at && (
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(mod.computed_at), { addSuffix: true, locale: pt })}
                          </span>
                        )}
                      </div>
                      {mod.last_error && (
                        <div className="flex items-start gap-1.5 p-2 rounded bg-destructive/5 text-destructive">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{mod.last_error}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Function Runs Table */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Edge Function Runs</h2>
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Function</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Module</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Latency</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Request ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">When</th>
                  </tr>
                </thead>
                <tbody>
                  {runsLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                  ) : !functionRuns?.length ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem registos de function runs</td></tr>
                  ) : (
                    functionRuns.map((run) => (
                      <tr key={run.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono">{run.function_name}</td>
                        <td className="p-3">{run.module_id ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={cn(
                            "text-[10px]",
                            run.status === "success" ? "text-emerald-500 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                          )}>
                            {run.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono">{run.latency_ms != null ? `${run.latency_ms}ms` : "—"}</td>
                        <td className="p-3 font-mono text-muted-foreground max-w-[120px] truncate">{run.request_id ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">
                          {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: pt })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Smoke Test History */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Smoke Test History</h2>
          <div className="space-y-2">
            {smokeRuns.length === 0 ? (
              <Card className="border-dashed border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Nenhum smoke test executado
                </CardContent>
              </Card>
            ) : (
              smokeRuns.map((run) => {
                const isExpanded = expandedRun === run.id;
                const runFailures = smokeFailures.filter((f) => f.run_id === run.id);
                return (
                  <Card key={run.id} className="border-border/50">
                    <CardContent className="py-3">
                      <button
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                        className="w-full flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-3">
                          {run.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : run.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {run.passed}/{run.total_checks} passed
                          </span>
                          {run.failed > 0 && (
                            <Badge variant="outline" className="text-destructive bg-destructive/10 text-[10px]">
                              {run.failed} failed
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: pt })}
                        </span>
                      </button>
                      {isExpanded && runFailures.length > 0 && (
                        <div className="mt-3 space-y-1.5 pl-7">
                          {runFailures.map((f) => (
                            <div key={f.id} className="flex items-start gap-2 text-xs p-2 rounded bg-destructive/5">
                              <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium">{f.module_id}</span>
                                <span className="text-muted-foreground"> · {f.check_name}</span>
                                {f.error_message && <p className="text-destructive mt-0.5">{f.error_message}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
