import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bug, ChevronDown, Play, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useKernelDebug } from "@/hooks/useKernelDebug";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export function KernelDebugPanel() {
  const [open, setOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { events, actionRuns, decisions, deadletterCount, driftScores } = useKernelDebug();
  const [running, setRunning] = useState<string | null>(null);

  const triggerFunction = async (fn: string) => {
    if (!currentWorkspace?.id) return;
    setRunning(fn);
    try {
      const { error } = await supabase.functions.invoke(fn, {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      toast.success(`${fn} executado com sucesso`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setRunning(null);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "success" || status === "processed" || status === "resolved") return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (status === "error" || status === "failed") return <XCircle className="h-3 w-3 text-destructive" />;
    if (status === "pending" || status === "open") return <Clock className="h-3 w-3 text-yellow-500" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const fmt = (d: string) => {
    try { return format(new Date(d), "HH:mm:ss"); } catch { return d; }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-dashed border-muted-foreground/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                Kernel Debug
                {(deadletterCount.data ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {deadletterCount.data} deadletter
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4 text-xs">
            {/* Manual triggers */}
            <div className="flex gap-2 flex-wrap">
              {["kernel-process-events", "kernel-compute-decisions", "kernel-compute-drift"].map(fn => (
                <Button
                  key={fn}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  disabled={running !== null}
                  onClick={() => triggerFunction(fn)}
                >
                  {running === fn ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {fn.replace("kernel-", "")}
                </Button>
              ))}
            </div>

            {/* Events */}
            <div>
              <p className="font-medium text-muted-foreground mb-1">Últimos Eventos ({events.data?.length ?? 0})</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {events.data?.map(e => (
                  <div key={e.id} className="flex items-center gap-1.5 py-0.5">
                    {statusIcon(e.status ?? "pending")}
                    <span className="text-muted-foreground">{fmt(e.created_at)}</span>
                    <span className="font-mono truncate flex-1">{e.type}</span>
                    <span className="text-muted-foreground truncate max-w-[100px]">{e.entity_kind}:{e.entity_id?.slice(0, 8)}</span>
                  </div>
                ))}
                {!events.data?.length && <p className="text-muted-foreground">Sem eventos</p>}
              </div>
            </div>

            {/* Action Runs */}
            <div>
              <p className="font-medium text-muted-foreground mb-1">Ações Executadas ({actionRuns.data?.length ?? 0})</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {actionRuns.data?.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 py-0.5">
                    {statusIcon(a.status)}
                    <span className="text-muted-foreground">{fmt(a.created_at)}</span>
                    <span className="font-mono truncate flex-1">{a.action_key}</span>
                    {a.error_message && (
                      <span className="text-destructive truncate max-w-[120px]" title={a.error_message}>
                        <AlertTriangle className="h-3 w-3 inline" /> {a.error_message.slice(0, 30)}
                      </span>
                    )}
                  </div>
                ))}
                {!actionRuns.data?.length && <p className="text-muted-foreground">Sem ações</p>}
              </div>
            </div>

            {/* Decisions */}
            <div>
              <p className="font-medium text-muted-foreground mb-1">Decisões ({decisions.data?.length ?? 0})</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {decisions.data?.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-1.5 py-0.5">
                    {statusIcon(d.status)}
                    <span className="text-muted-foreground">{fmt(d.created_at)}</span>
                    <span className="font-mono truncate flex-1">{d.type}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {d.kernel_decision_evidence?.length ?? 0} ev
                    </Badge>
                  </div>
                ))}
                {!decisions.data?.length && <p className="text-muted-foreground">Sem decisões</p>}
              </div>
            </div>

            {/* Drift */}
            <div>
              <p className="font-medium text-muted-foreground mb-1">Top Drift Scores</p>
              <div className="space-y-0.5">
                {driftScores.data?.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-1.5 py-0.5">
                    <span className={`font-bold ${d.score > 60 ? "text-destructive" : d.score > 30 ? "text-yellow-500" : "text-green-500"}`}>
                      {d.score}
                    </span>
                    <span className="font-mono truncate flex-1">{d.scope_kind}:{d.scope_id?.slice(0, 8)}</span>
                    <span className="text-muted-foreground">{fmt(d.computed_at)}</span>
                  </div>
                ))}
                {!driftScores.data?.length && <p className="text-muted-foreground">Sem drift scores</p>}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
