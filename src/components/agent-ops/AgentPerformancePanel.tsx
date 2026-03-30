import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useAgentPerformanceStats } from "@/hooks/useAgentOperations";
import { useBots } from "@/hooks/useBots";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useState } from "react";

export function AgentPerformancePanel() {
  const { data: perfStats, isLoading } = useAgentPerformanceStats();
  const { bots } = useBots();
  const { currentWorkspace } = useWorkspace();
  const [runningCheck, setRunningCheck] = useState(false);

  const runSupervisorCheck = async () => {
    if (!currentWorkspace?.id) return;
    setRunningCheck(true);
    try {
      const { data, error } = await supabase.functions.invoke("supervisor-agent-check", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.alerts?.length > 0) {
        toast.warning(`Supervisor: ${data.alerts.length} alerta(s) detetado(s)`);
      } else {
        toast.success("Supervisor: sem alertas");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar supervisor");
    } finally {
      setRunningCheck(false);
    }
  };

  const getBotName = (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    return bot?.name || botId.slice(0, 8);
  };

  const getBotRole = (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    return bot?.role || "—";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = perfStats || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Performance dos agentes nos últimos 7 dias.</p>
        <Button variant="outline" size="sm" onClick={runSupervisorCheck} disabled={runningCheck}>
          {runningCheck ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Verificar Supervisor
        </Button>
      </div>

      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Sem dados de performance. Os agentes precisam de work items atribuídos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stats.map((s) => {
            const successRate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
            const failureRate = s.total > 0 ? (s.failed / s.total) * 100 : 0;
            const isHealthy = successRate >= 60 || s.total < 3;
            const avgHours = s.avgCompletionMs > 0 ? (s.avgCompletionMs / 3600000).toFixed(1) : "—";

            return (
              <Card key={s.botId} className={!isHealthy ? "border-destructive/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{getBotName(s.botId)}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{getBotRole(s.botId)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Success rate bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Taxa de sucesso</span>
                      <span className={successRate >= 60 ? "text-emerald-600" : "text-destructive"}>
                        {successRate.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={successRate}
                      className="h-1.5 [&>div]:bg-emerald-500"
                    />
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{s.total}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{s.completed}</p>
                      <p className="text-[10px] text-muted-foreground">Concluídos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-destructive">{s.failed}</p>
                      <p className="text-[10px] text-muted-foreground">Falhados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-500">{s.open}</p>
                      <p className="text-[10px] text-muted-foreground">Abertos</p>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tempo médio: {avgHours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Throughput: {s.completed}/7d
                    </span>
                  </div>

                  {/* Alerts */}
                  {!isHealthy && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/5 px-2 py-1.5 rounded">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Taxa de falha elevada ({failureRate.toFixed(0)}%)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
