import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useKernelEvents } from "@/hooks/useKernelEvents";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { useKernelActions } from "@/hooks/useKernelActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radio,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-chart-2" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  pending: <Clock className="h-3.5 w-3.5 text-chart-4" />,
  processed: <CheckCircle className="h-3.5 w-3.5 text-chart-2" />,
};

function HealthIndicator({ label, value, status }: { label: string; value: number; status: "ok" | "warn" | "error" }) {
  const colors = {
    ok: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    warn: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg border ${colors[status]}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

export default function KernelMonitorPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: events, isLoading: eventsLoading } = useKernelEvents(50);
  const { decisions, isLoading: decisionsLoading } = useKernelDecisions();
  const { todayRuns, successCount, isLoading: actionsLoading } = useKernelActions();
  const [processing, setProcessing] = useState(false);

  const pendingEvents = events?.filter((e) => !e.status || e.status === "pending").length ?? 0;
  const openDecisions = decisions?.filter((d) => d.status === "open").length ?? 0;
  const failedActions = todayRuns.filter((r) => r.status === "failed").length;

  const handleProcessEvents = async () => {
    if (!wid) return;
    setProcessing(true);
    try {
      await supabase.functions.invoke("kernel-process-events", {
        body: { workspace_id: wid },
      });
      toast.success("Eventos processados");
    } catch {
      toast.error("Falha no processamento");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kernel Monitor</h1>
          <p className="text-sm text-muted-foreground">Monitorização do motor de orquestração</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleProcessEvents} disabled={processing}>
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Processar Eventos
        </Button>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HealthIndicator label="Eventos Pendentes" value={pendingEvents} status={pendingEvents > 20 ? "error" : pendingEvents > 5 ? "warn" : "ok"} />
        <HealthIndicator label="Decisões Abertas" value={openDecisions} status={openDecisions > 10 ? "warn" : "ok"} />
        <HealthIndicator label="Ações Falhadas" value={failedActions} status={failedActions > 0 ? "error" : "ok"} />
        <HealthIndicator label="Sucesso Hoje" value={successCount} status="ok" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <Radio className="h-3.5 w-3.5" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" /> Decisões
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Ações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Eventos Recentes
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{events?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-4 pb-4">
                {eventsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !events?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Sem eventos</p>
                ) : (
                  <div className="space-y-1">
                    {events.map((evt) => (
                      <div key={evt.id} className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
                        {STATUS_ICON[(evt as any).status] ?? STATUS_ICON.pending}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{evt.type}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {evt.entity_kind}:{evt.entity_id?.slice(0, 8)}
                            {evt.source_module ? ` · ${evt.source_module}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{(evt as any).status ?? "pending"}</Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Decisões Geradas
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{decisions?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-4 pb-4">
                {decisionsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !decisions?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Sem decisões</p>
                ) : (
                  <div className="space-y-2">
                    {decisions.map((d) => (
                      <div key={d.id} className="p-2.5 rounded-md border border-border/20 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                          <Badge variant={d.status === "open" ? "default" : "secondary"} className="text-[10px]">{d.status}</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}
                          </span>
                        </div>
                        <p className="text-xs">{d.summary}</p>
                        {d.rationale && <p className="text-[10px] text-muted-foreground mt-1">{d.rationale}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Ações Executadas Hoje
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{todayRuns.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-4 pb-4">
                {actionsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !todayRuns.length ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Sem ações hoje</p>
                ) : (
                  <div className="space-y-1">
                    {todayRuns.map((run) => (
                      <div key={run.id} className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
                        {STATUS_ICON[run.status] ?? STATUS_ICON.queued}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{run.action_key}</p>
                          {run.error && <p className="text-[10px] text-destructive truncate">{run.error}</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
