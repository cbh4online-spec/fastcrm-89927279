import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Cpu, Plus, Play, Square, Clock, CheckCircle, XCircle, AlertTriangle,
  Brain, Zap, Target, Loader2, Calendar, Database, List, BookOpen,
  ChevronRight, Pause
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAIAgentJobs,
  useAgentRegistry,
  useAgentSystemStats,
  useCreateAgentJob,
  useCancelAgentJob,
} from "@/hooks/useAIAgentJobs";
import { useAgentMemory, useAgentSchedules } from "@/hooks/useAIAgentExecutions";
import type { AIAgentJob, AgentJobStatus, CreateAgentJobRequest } from "@/types/ai-agents";

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Pendente" },
  queued: { icon: <List className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Em fila" },
  running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "A executar" },
  paused: { icon: <Pause className="h-3.5 w-3.5" />, color: "bg-orange-500/10 text-orange-600 border-orange-500/20", label: "Pausado" },
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-600 border-green-500/20", label: "Concluído" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-500/10 text-red-600 border-red-500/20", label: "Falhado" },
  cancelled: { icon: <Square className="h-3.5 w-3.5" />, color: "bg-gray-500/10 text-gray-600 border-gray-500/20", label: "Cancelado" },
  timeout: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Timeout" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1 text-xs`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function StatsBar() {
  const { data: stats, isLoading } = useAgentSystemStats();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  if (!stats) return null;

  const items = [
    { label: "Pendentes", value: stats.pending_jobs, icon: <Clock className="h-4 w-4 text-yellow-500" /> },
    { label: "A executar", value: stats.running_jobs, icon: <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" /> },
    { label: "Hoje ✓", value: stats.completed_today, icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { label: "Hoje ✗", value: stats.failed_today, icon: <XCircle className="h-4 w-4 text-red-500" /> },
    { label: "Agendamentos", value: stats.active_schedules, icon: <Calendar className="h-4 w-4 text-blue-500" /> },
    { label: "Memória", value: stats.total_memory_entries, icon: <Database className="h-4 w-4 text-purple-500" /> },
    { label: "Sucesso 7d", value: `${stats.success_rate_7d}%`, icon: <Target className="h-4 w-4 text-emerald-500" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-3 flex items-center gap-2">
            {item.icon}
            <div>
              <p className="text-lg font-bold leading-none">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function JobCard({ job }: { job: AIAgentJob }) {
  const navigate = useNavigate();
  const cancelJob = useCancelAgentJob();
  const canCancel = ['pending', 'queued', 'running'].includes(job.status);

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-all group"
      onClick={() => navigate(`/dashboard/ai-agents/${job.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">{job.name || job.task?.substring(0, 50) || job.agent_type}</span>
              <StatusBadge status={job.status} />
              {job.priority >= 8 && <Badge variant="destructive" className="text-xs">P{job.priority}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {job.task || job.description || 'Sem descrição'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {job.agent_type}
              </span>
              {job.target_entity_type && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {job.target_entity_type}
                </span>
              )}
              <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}</span>
              {job.completed_at && job.started_at && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelJob.mutate(job.id, { onSuccess: () => toast.success("Job cancelado") });
                }}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateJobDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: registry } = useAgentRegistry();
  const createJob = useCreateAgentJob();
  const [form, setForm] = useState<CreateAgentJobRequest>({
    agent_type: 'general',
    name: '',
    task: '',
    priority: 5,
    max_steps: 10,
  });

  const handleSubmit = async () => {
    if (!form.name || !form.task) {
      toast.error("Nome e tarefa são obrigatórios");
      return;
    }
    try {
      await createJob.mutateAsync(form);
      toast.success("Job criado e despachado!");
      onOpenChange(false);
      setForm({ agent_type: 'general', name: '', task: '', priority: 5, max_steps: 10 });
    } catch (e) {
      toast.error("Erro ao criar job: " + (e as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Job de Agente</SheetTitle>
          <SheetDescription>Configure e execute um agente IA autónomo.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Tipo de Agente</label>
            <Select value={form.agent_type} onValueChange={(v) => setForm(p => ({ ...p, agent_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(registry ?? []).map(r => (
                  <SelectItem key={r.agent_type} value={r.agent_type}>
                    <span className="font-medium">{r.display_name}</span>
                    {r.description && <span className="text-xs text-muted-foreground ml-2">{r.description}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Nome do Job</label>
            <Input placeholder="Ex: Análise de contactos inativos" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Tarefa (prompt)</label>
            <Textarea
              placeholder="Ex: Lista os 5 contactos com mais tempo sem interação e cria tarefas de follow-up para cada um"
              rows={5}
              value={form.task}
              onChange={e => setForm(p => ({ ...p, task: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Entidade alvo (opcional)</label>
            <Select value={form.target_entity_type || 'none'} onValueChange={(v) => setForm(p => ({ ...p, target_entity_type: v === 'none' ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (workspace-wide)</SelectItem>
                <SelectItem value="contact">Contacto</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="opportunity">Oportunidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Prioridade: {form.priority}</label>
            <Slider
              value={[form.priority ?? 5]}
              onValueChange={([v]) => setForm(p => ({ ...p, priority: v }))}
              min={1} max={10} step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Baixa</span><span>Alta</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Max passos: {form.max_steps}</label>
            <Slider
              value={[form.max_steps ?? 10]}
              onValueChange={([v]) => setForm(p => ({ ...p, max_steps: v }))}
              min={1} max={20} step={1}
              className="mt-2"
            />
          </div>
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createJob.isPending}>
            {createJob.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Executar agora
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function JobsTab({ statusFilter }: { statusFilter?: string }) {
  const { data: jobs, isLoading } = useAIAgentJobs(statusFilter ? { status: statusFilter } : undefined);

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>;
  if (!jobs?.length) return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Cpu className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Nenhum job encontrado</h3>
        <p className="text-sm text-muted-foreground">Cria um novo job para começar a automatizar tarefas com IA.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}

function SchedulesTab() {
  const { data: schedules, isLoading } = useAgentSchedules();

  if (isLoading) return <Skeleton className="h-48" />;
  if (!schedules?.length) return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Sem agendamentos</h3>
        <p className="text-sm text-muted-foreground">Os agendamentos permitem executar agentes automaticamente com cron.</p>
      </CardContent>
    </Card>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Agente</TableHead>
          <TableHead>Cron</TableHead>
          <TableHead>Última exec.</TableHead>
          <TableHead>Próxima exec.</TableHead>
          <TableHead>Runs</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map(s => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>{s.agent_type}</TableCell>
            <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{s.cron_expression}</code></TableCell>
            <TableCell className="text-xs">{s.last_run_at ? formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true, locale: pt }) : '—'}</TableCell>
            <TableCell className="text-xs">{s.next_run_at ? formatDistanceToNow(new Date(s.next_run_at), { addSuffix: true, locale: pt }) : '—'}</TableCell>
            <TableCell>{s.total_runs} ({s.successful_runs} ✓)</TableCell>
            <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MemoryTab() {
  const [agentFilter, setAgentFilter] = useState<string | undefined>();
  const { data: memory, isLoading } = useAgentMemory(agentFilter);
  const { data: registry } = useAgentRegistry();

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <Select value={agentFilter || 'all'} onValueChange={v => setAgentFilter(v === 'all' ? undefined : v)}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Todos os agentes" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os agentes</SelectItem>
          {(registry ?? []).map(r => <SelectItem key={r.agent_type} value={r.agent_type}>{r.display_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {!memory?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sem memória armazenada.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Importância</TableHead>
              <TableHead>Acessos</TableHead>
              <TableHead>Último acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memory.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.memory_key || '—'}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{m.scope}</Badge></TableCell>
                <TableCell>{m.memory_type}</TableCell>
                <TableCell>{(m.importance * 100).toFixed(0)}%</TableCell>
                <TableCell>{m.access_count}</TableCell>
                <TableCell className="text-xs">{m.last_accessed_at ? formatDistanceToNow(new Date(m.last_accessed_at), { addSuffix: true, locale: pt }) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function RegistryTab() {
  const { data: registry, isLoading } = useAgentRegistry();

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(registry ?? []).map(r => (
        <Card key={r.id} className={`${r.is_system ? 'border-primary/20' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                {r.display_name}
              </CardTitle>
              {r.is_system && <Badge variant="outline" className="text-xs">Sistema</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">{r.description}</p>
            <div className="flex flex-wrap gap-1">
              {r.capabilities?.slice(0, 4).map(c => (
                <Badge key={c} variant="secondary" className="text-xs">{c.replace('_', ' ')}</Badge>
              ))}
              {(r.capabilities?.length ?? 0) > 4 && (
                <Badge variant="secondary" className="text-xs">+{r.capabilities!.length - 4}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Handler: <code className="bg-muted px-1 rounded">{r.handler_function}</code></p>
              <p>Versão: {r.version} | Temp: {r.default_temperature} | Steps: {r.default_max_steps}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AIAgentsPage() {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const { data: stats } = useAgentSystemStats();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="h-6 w-6 text-primary" />
              AI Agents
            </h1>
            <p className="text-sm text-muted-foreground">
              Orquestração distribuída de agentes IA autónomos
            </p>
          </div>
          <Button onClick={() => setCreateDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Job
          </Button>
        </div>

        <StatsBar />

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-1">
              <Play className="h-3.5 w-3.5" />
              Jobs {stats?.running_jobs ? `(${stats.running_jobs} ▶)` : ''}
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-1">
              <Database className="h-3.5 w-3.5" />
              Memória
            </TabsTrigger>
            <TabsTrigger value="registry" className="gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Registo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs"><JobsTab /></TabsContent>
          <TabsContent value="schedules"><SchedulesTab /></TabsContent>
          <TabsContent value="memory"><MemoryTab /></TabsContent>
          <TabsContent value="registry"><RegistryTab /></TabsContent>
        </Tabs>

        <CreateJobDrawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen} />
      </div>
    </DashboardLayout>
  );
}
