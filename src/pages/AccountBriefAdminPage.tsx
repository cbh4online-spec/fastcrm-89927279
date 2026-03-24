import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { useAccountBriefAnalysisRuns } from "@/hooks/useAccountBriefAnalysisRuns";
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Database, FileText, Globe } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AccountBriefAdminPage() {
  const { accounts } = useAccountBriefAccounts();
  const { runs, triggerAnalysis } = useAccountBriefAnalysisRuns();
  const [rerunning, setRerunning] = useState<string | null>(null);

  const failedRuns = runs.filter((r) => r.status === "failed" || r.status === "partial");
  const recentRuns = runs.slice(0, 20);

  const totalPages = accounts.reduce((sum, _a) => sum + 1, 0); // placeholder
  const analyzedCount = accounts.filter((a) => a.last_analysis_at).length;
  const pendingCount = accounts.filter((a) => !a.last_analysis_at).length;

  const handleRerun = async (accountId: string) => {
    setRerunning(accountId);
    try {
      await triggerAnalysis.mutateAsync(accountId);
      toast.success("Análise relançada!");
    } catch {
      toast.error("Erro ao relançar análise");
    } finally {
      setRerunning(null);
    }
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Account Brief — Admin" description="Gestão técnica e operacional do módulo" />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Contas Totais", value: accounts.length, icon: Database, color: "text-indigo-500" },
              { label: "Analisadas", value: analyzedCount, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Sem Análise", value: pendingCount, icon: AlertTriangle, color: "text-amber-500" },
              { label: "Runs Falhados", value: failedRuns.length, icon: AlertTriangle, color: "text-destructive" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-0 shadow-lg">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                    <div>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Accounts without analysis */}
          {pendingCount > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500" /> Contas sem análise ({pendingCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accounts.filter((a) => !a.last_analysis_at).slice(0, 10).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.domain}</p>
                      </div>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => handleRerun(account.id)}
                        disabled={rerunning === account.id}
                        className="gap-1"
                      >
                        {rerunning === account.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Analisar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed runs */}
          {failedRuns.length > 0 && (
            <Card className="border-0 shadow-lg border-destructive/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> Runs com erros ({failedRuns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {failedRuns.slice(0, 10).map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">{run.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {run.created_at ? format(new Date(run.created_at), "dd/MM HH:mm") : "—"}
                          </span>
                        </div>
                        {run.error_summary && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{run.error_summary}</p>
                        )}
                      </div>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => handleRerun(run.account_id)}
                        disabled={rerunning === run.account_id}
                        className="gap-1"
                      >
                        <RefreshCw className={cn("w-3 h-3", rerunning === run.account_id && "animate-spin")} />
                        Relançar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent runs */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Últimas Execuções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem execuções registadas</p>
                ) : (
                  recentRuns.map((run) => {
                    const statusColor = run.status === "completed" ? "bg-emerald-500/20 text-emerald-600"
                      : run.status === "failed" ? "bg-destructive/20 text-destructive"
                      : run.status === "processing" ? "bg-blue-500/20 text-blue-500"
                      : "bg-muted text-muted-foreground";
                    return (
                      <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Badge className={cn("text-xs", statusColor)}>{run.status}</Badge>
                          <span className="text-sm">{run.account_id?.substring(0, 8)}…</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {run.pages_processed != null && <span>{run.pages_processed} pág.</span>}
                          {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                          <span>{run.created_at ? format(new Date(run.created_at), "dd/MM HH:mm") : "—"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
