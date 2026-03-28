import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useKernelEvents } from "@/hooks/useKernelEvents";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { useKernelActions } from "@/hooks/useKernelActions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  Cpu,
  Activity,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Play,
  Archive,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  processed: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  processing: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  pending: <Clock className="h-3.5 w-3.5 text-chart-4" />,
  open: <Clock className="h-3.5 w-3.5 text-chart-4" />,
  accepted: <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />,
  rejected: <ThumbsDown className="h-3.5 w-3.5 text-destructive" />,
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  processed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  open: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

function StatCard({ label, value, status, icon: Icon }: { label: string; value: number; status: "ok" | "warn" | "error"; icon: typeof Activity }) {
  const colors = {
    ok: "border-emerald-500/20 bg-emerald-500/5",
    warn: "border-chart-4/20 bg-chart-4/5",
    error: "border-destructive/20 bg-destructive/5",
  };
  const valueColors = {
    ok: "text-emerald-400",
    warn: "text-chart-4",
    error: "text-destructive",
  };
  return (
    <div className={cn("flex items-center gap-3 py-3 px-4 rounded-xl border", colors[status])}>
      <Icon className={cn("h-5 w-5", valueColors[status])} />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", valueColors[status])}>{value}</p>
      </div>
    </div>
  );
}

export default function KernelMonitorPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: events, isLoading: eventsLoading } = useKernelEvents(50);
  const { decisions, isLoading: decisionsLoading, acceptDecision, rejectDecision, executeDecision, archiveDecision } = useKernelDecisions();
  const { todayRuns, successCount, isLoading: actionsLoading } = useKernelActions();
  const [processing, setProcessing] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | "pending" | "processed">("all");

  const pendingEvents = useMemo(() => events?.filter(e => e.status === "pending").length ?? 0, [events]);
  const processedEvents = useMemo(() => events?.filter(e => e.status === "processed").length ?? 0, [events]);
  const openDecisions = decisions?.filter((d) => d.status === "open").length ?? 0;
  const failedActions = todayRuns.filter((r) => r.status === "failed").length;

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (eventFilter === "all") return events;
    return events.filter(e => e.status === eventFilter);
  }, [events, eventFilter]);

  const handleProcessEvents = async () => {
    if (!wid) return;
    setProcessing(true);
    try {
      await supabase.functions.invoke("kernel-process-events", {
        body: { workspace_id: wid },
      });
      toast.success("Eventos processados com sucesso");
    } catch {
      toast.error("Falha no processamento de eventos");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Kernel Monitor</h1>
                <p className="text-sm text-muted-foreground">
                  Motor de orquestração — recebe eventos, gera decisões e executa ações automaticamente
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleProcessEvents} disabled={processing}>
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Processar Eventos
            </Button>
          </div>

          {/* Pipeline explanation */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border/30">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-chart-4" />
              <span>Eventos entram</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-primary" />
              <span>Motor decide</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>Ações executam</span>
            </div>
          </div>
        </div>

        {/* Health Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Clock} label="Eventos Pendentes" value={pendingEvents} status={pendingEvents > 20 ? "error" : pendingEvents > 5 ? "warn" : "ok"} />
          <StatCard icon={Brain} label="Decisões Abertas" value={openDecisions} status={openDecisions > 10 ? "warn" : "ok"} />
          <StatCard icon={XCircle} label="Ações Falhadas" value={failedActions} status={failedActions > 0 ? "error" : "ok"} />
          <StatCard icon={CheckCircle} label="Sucesso Hoje" value={successCount} status="ok" />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events" className="gap-1.5 text-xs">
              <Radio className="h-3.5 w-3.5" /> Eventos
              {pendingEvents > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{pendingEvents}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" /> Decisões
              {openDecisions > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{openDecisions}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Ações
            </TabsTrigger>
          </TabsList>

          {/* EVENTS TAB */}
          <TabsContent value="events">
            <Card className="border-border/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" /> Eventos Recentes
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{events?.length ?? 0}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Filter className="h-3 w-3 text-muted-foreground" />
                    {(["all", "pending", "processed"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setEventFilter(f)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                          eventFilter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Processados"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] px-4 pb-4">
                  {eventsLoading ? (
                    <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : !filteredEvents.length ? (
                    <div className="text-center py-16 space-y-2">
                      <Radio className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        {eventFilter !== "all"
                          ? `Sem eventos ${eventFilter === "pending" ? "pendentes" : "processados"}`
                          : "Sem eventos — ações nos módulos (vendas, leads, tarefas) geram eventos automaticamente"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredEvents.map((evt) => (
                        <div key={evt.id} className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
                          {STATUS_ICON[evt.status] ?? STATUS_ICON.pending}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{evt.event_name || evt.type}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {evt.entity_kind}:{evt.entity_id?.slice(0, 8)}
                              {evt.source_module ? ` · ${evt.source_module}` : ""}
                            </p>
                          </div>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", STATUS_BADGE_VARIANT[evt.status] || "text-muted-foreground")}>
                            {evt.status}
                          </span>
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

          {/* DECISIONS TAB */}
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
                    <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                  ) : !decisions?.length ? (
                    <div className="text-center py-16 space-y-2">
                      <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Sem decisões — o motor analisa eventos e gera decisões automáticas quando detecta padrões (deals parados, churn risk, etc.)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {decisions.map((d) => (
                        <div key={d.id} className="p-3 rounded-lg border border-border/30 hover:border-primary/20 transition-colors space-y-2">
                          <div className="flex items-center gap-2">
                            {STATUS_ICON[d.status] ?? STATUS_ICON.open}
                            <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", STATUS_BADGE_VARIANT[d.status] || "text-muted-foreground")}>
                              {d.status}
                            </span>
                            {d.priority > 7 && <Badge variant="destructive" className="text-[9px] h-4">Urgente</Badge>}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}
                            </span>
                          </div>
                          <p className="text-xs font-medium">{d.summary}</p>
                          {d.rationale && <p className="text-[10px] text-muted-foreground">{d.rationale}</p>}

                          {/* Action buttons for open decisions */}
                          {d.status === "open" && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                                onClick={() => acceptDecision.mutate(d.id)}
                                disabled={acceptDecision.isPending}
                              >
                                <ThumbsUp className="h-3 w-3" /> Aceitar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1"
                                onClick={() => executeDecision.mutate(d.id)}
                                disabled={executeDecision.isPending}
                              >
                                <Play className="h-3 w-3" /> Executar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={() => rejectDecision.mutate(d.id)}
                                disabled={rejectDecision.isPending}
                              >
                                <ThumbsDown className="h-3 w-3" /> Rejeitar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] gap-1 ml-auto"
                                onClick={() => archiveDecision.mutate(d.id)}
                                disabled={archiveDecision.isPending}
                              >
                                <Archive className="h-3 w-3" /> Arquivar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIONS TAB */}
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
                    <div className="text-center py-16 space-y-2">
                      <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Sem ações hoje — quando decisões são aceites ou auto-executadas, as ações aparecem aqui
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {todayRuns.map((run) => (
                        <div key={run.id} className={cn(
                          "flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors",
                          run.status === "failed" && "bg-destructive/5"
                        )}>
                          {STATUS_ICON[run.status] ?? STATUS_ICON.queued}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{run.action_key}</p>
                            {run.error && <p className="text-[10px] text-destructive truncate">{run.error}</p>}
                          </div>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", STATUS_BADGE_VARIANT[run.status] || "text-muted-foreground")}>
                            {run.status}
                          </span>
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
    </DashboardLayout>
  );
}
