import { useState, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTriggerJobs } from "@/hooks/useTriggerJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCog,
  Cpu,
  Bot,
  RefreshCw,
  Lightbulb,
  Mail,
  CreditCard,
  FileText,
  TrendingUp,
  Database,
  BarChart3,
  Volume2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Timer,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

const SCHEDULED_TASKS = [
  { id: "ai-employee-scheduler", label: "AI Employees", cron: "A cada 5 minutos", icon: UserCog, canTrigger: true, triggerId: "run-ai-employee" },
  { id: "ai-agent-lifecycle-manager", label: "AI Agents Lifecycle", cron: "A cada 2 minutos", icon: Cpu, canTrigger: true, triggerId: "ai-agent-lifecycle-manager" },
  { id: "ai-agent-scheduler", label: "AI Agents Schedule", cron: "A cada 5 minutos", icon: Bot, canTrigger: false },
  { id: "daily-renewal-check", label: "Renovações", cron: "Diário às 8h00", icon: RefreshCw, canTrigger: true, triggerId: "check-workspace-renewals" },
  { id: "weekly-renewal-suggestions", label: "Sugestões Renovação", cron: "Segunda às 9h00", icon: Lightbulb, canTrigger: false },
  { id: "sequence-step-processor", label: "Sequências", cron: "A cada 15 minutos", icon: Mail, canTrigger: false },
  { id: "b2b-plan-cycle-processor", label: "Planos B2B", cron: "Diário às 6h00", icon: CreditCard, canTrigger: false },
  { id: "daily-brief-generator", label: "Daily Brief", cron: "Diário às 7h00", icon: FileText, canTrigger: true, triggerId: "generate-workspace-brief" },
  { id: "imo-ai-weekly-refresh", label: "IMO AI Refresh", cron: "Domingo às 2h00", icon: TrendingUp, canTrigger: false },
  { id: "daily-maintenance", label: "Manutenção DB", cron: "Diário às 3h00", icon: Database, canTrigger: false },
  { id: "monthly-budget-reset", label: "Reset Orçamento IA", cron: "Dia 1 de cada mês", icon: BarChart3, canTrigger: false },
  { id: "weekly-voice-storage-cleanup", label: "Limpeza de Voz", cron: "Sábado às 4h00", icon: Volume2, canTrigger: false },
];

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  queued: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock, label: "Na fila" },
  pending: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock, label: "Pendente" },
  running: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Loader2, label: "A executar" },
  executing: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Loader2, label: "A executar" },
  completed: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Concluído" },
  failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, label: "Falhado" },
  cancelled: { color: "bg-muted text-muted-foreground border-border", icon: XCircle, label: "Cancelado" },
  timed_out: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Timeout" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1`}>
      <Icon className={`h-3 w-3 ${status === "running" || status === "executing" ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}

export default function BackgroundJobsPage() {
  const { currentWorkspace } = useWorkspace();
  const { jobs, isLoading, refetch } = useTriggerJobs({ limit: 100, autoRefresh: true, refreshInterval: 15000 });
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const now = Date.now();
    const last24h = jobs.filter(j => new Date(j.created_at).getTime() > now - 86400000);
    return {
      total: last24h.length,
      completed: last24h.filter(j => j.status === "completed").length,
      failed: last24h.filter(j => j.status === "failed" || j.status === "timed_out").length,
      executing: last24h.filter(j => j.status === "running" || j.status === "executing").length,
    };
  }, [jobs]);

  const taskLastRun = useMemo(() => {
    const map: Record<string, any> = {};
    for (const job of jobs) {
      const taskId = job.job_type;
      if (!map[taskId]) map[taskId] = job;
    }
    return map;
  }, [jobs]);

  const filteredRuns = useMemo(() => {
    const runs = jobs.slice(0, 50);
    if (statusFilter === "all") return runs;
    return runs.filter(j => j.status === statusFilter);
  }, [jobs, statusFilter]);

  const handleTrigger = async (taskId: string) => {
    if (!currentWorkspace?.id) return;
    setTriggeringTask(taskId);
    try {
      const { error } = await supabase.functions.invoke("trigger-dispatch", {
        body: {
          task_id: taskId,
          payload: { workspace_id: currentWorkspace.id },
          workspace_id: currentWorkspace.id,
        },
      });
      if (error) throw error;
      toast.success("Job disparado com sucesso");
      setTimeout(refetch, 1000);
    } catch {
      toast.error("Erro ao disparar job");
    } finally {
      setTriggeringTask(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Background Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitorização e gestão de tarefas agendadas via Trigger.dev
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://cloud.trigger.dev" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Trigger.dev
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total (24h)", value: stats.total, icon: Timer, color: "text-foreground" },
          { label: "Concluídos", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Falhados", value: stats.failed, icon: XCircle, color: "text-red-400" },
          { label: "A executar", value: stats.executing, icon: Loader2, color: "text-yellow-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Tasks Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tarefas Agendadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {SCHEDULED_TASKS.map(task => {
            const Icon = task.icon;
            const lastRun = taskLastRun[task.id];
            return (
              <Card key={task.id} className="relative">
                <CardContent className="pt-4 pb-3 px-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{task.label}</span>
                    </div>
                    {lastRun && <StatusBadge status={lastRun.status} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{task.cron}</p>
                  {lastRun && (
                    <p className="text-xs text-muted-foreground">
                      Última: {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true, locale: pt })}
                    </p>
                  )}
                  {task.canTrigger && task.triggerId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1"
                      disabled={triggeringTask === task.triggerId}
                      onClick={() => handleTrigger(task.triggerId!)}
                    >
                      {triggeringTask === task.triggerId ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      Executar agora
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Execuções Recentes</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
                <SelectItem value="running">A executar</SelectItem>
                <SelectItem value="queued">Na fila</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Iniciado</TableHead>
                <TableHead>Trigger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !jobs.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filteredRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Sem execuções registadas
                  </TableCell>
                </TableRow>
              ) : (
                filteredRuns.map(run => {
                  const taskConfig = SCHEDULED_TASKS.find(t => t.id === run.job_type);
                  return (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRun(run)}
                    >
                      <TableCell className="font-medium text-sm">
                        {taskConfig?.label || run.job_type}
                      </TableCell>
                      <TableCell><StatusBadge status={run.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {run.started_at && run.completed_at
                          ? `${((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1)}s`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {run.created_at
                          ? format(new Date(run.created_at), "dd/MM HH:mm", { locale: pt })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {(run.input_data as any)?.triggered_by || "schedule"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Run Detail Drawer */}
      <Sheet open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <SheetContent className="w-[450px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Detalhe da Execução</SheetTitle>
          </SheetHeader>
          {selectedRun && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tarefa</span>
                  <span className="font-medium text-sm">
                    {SCHEDULED_TASKS.find(t => t.id === selectedRun.job_type)?.label || selectedRun.job_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <StatusBadge status={selectedRun.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trigger</span>
                  <Badge variant="outline">{(selectedRun.input_data as any)?.triggered_by || "schedule"}</Badge>
                </div>
                {selectedRun.trigger_run_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Run ID</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedRun.trigger_run_id}
                    </code>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Criado</span>
                  <span className="text-sm">
                    {selectedRun.created_at
                      ? format(new Date(selectedRun.created_at), "dd/MM/yyyy HH:mm:ss")
                      : "—"}
                  </span>
                </div>
                {selectedRun.started_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Iniciado</span>
                    <span className="text-sm">
                      {format(new Date(selectedRun.started_at), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </div>
                )}
                {selectedRun.completed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Concluído</span>
                    <span className="text-sm">
                      {format(new Date(selectedRun.completed_at), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </div>
                )}
              </div>

              {selectedRun.error_data && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-destructive">Erro</span>
                  <pre className="text-xs bg-destructive/10 border border-destructive/20 rounded p-3 whitespace-pre-wrap">
                    {JSON.stringify(selectedRun.error_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRun.output_data && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Output</span>
                  <pre className="text-xs bg-muted rounded p-3 max-h-[300px] overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedRun.output_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRun.input_data && Object.keys(selectedRun.input_data).length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Payload</span>
                  <pre className="text-xs bg-muted rounded p-3 max-h-[200px] overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedRun.input_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
