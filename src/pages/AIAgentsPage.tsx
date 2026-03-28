import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Cpu, Plus, Play, Square, Clock, CheckCircle, XCircle, AlertTriangle,
  Brain, Zap, Target, Loader2, Calendar, Database, List, BookOpen,
  ChevronRight, Pause, Search, RotateCcw, Trash2, Eye, Activity,
  ArrowUpDown, Filter, Sparkles, FileText, Users, Building2, Briefcase,
  RefreshCw, Settings, ChevronDown, ExternalLink, AlertCircle, Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  useAIAgentJobs,
  useAgentRegistry,
  useAgentSystemStats,
  useCreateAgentJob,
  useCancelAgentJob,
  useRunProcessor,
} from "@/hooks/useAIAgentJobs";
import { useAgentMemory, useAgentSchedules } from "@/hooks/useAIAgentExecutions";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { AIAgentJob, CreateAgentJobRequest } from "@/types/ai-agents";

// ============================================================================
// CONSTANTS
// ============================================================================

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string; bg: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20", label: "Pendente" },
  queued: { icon: <List className="h-3.5 w-3.5" />, color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20", label: "Em fila" },
  running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20", label: "A executar" },
  paused: { icon: <Pause className="h-3.5 w-3.5" />, color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/20", label: "Pausado" },
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-green-600", bg: "bg-green-500/10 border-green-500/20", label: "Concluído" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", label: "Falhado" },
  cancelled: { icon: <Square className="h-3.5 w-3.5" />, color: "text-muted-foreground", bg: "bg-muted border-border", label: "Cancelado" },
  timeout: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20", label: "Timeout" },
};

const ENTITY_ICONS: Record<string, typeof Target> = {
  lead: Target,
  contact: Users,
  company: Building2,
  opportunity: Briefcase,
};

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  contact: "Contacto",
  company: "Empresa",
  opportunity: "Oportunidade",
};

const JOB_TEMPLATES = [
  {
    id: "analyze-lead",
    name: "Analisar Lead",
    description: "Avalia sinais de compra, risco e próxima ação recomendada",
    agent_type: "lead",
    entity_type: "lead",
    task: "Analisa este lead em profundidade: identifica sinais de compra, avalia o nível de risco, sugere a próxima melhor ação e justifica com dados.",
    icon: Target,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "analyze-contact",
    name: "Analisar Contacto",
    description: "Perfil comportamental, histórico de interações e recomendações",
    agent_type: "contact",
    entity_type: "contact",
    task: "Analisa este contacto: perfil comportamental, padrões de interação, preferências conhecidas e melhores canais de comunicação.",
    icon: Users,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "analyze-opportunity",
    name: "Analisar Oportunidade",
    description: "Probabilidade de fecho, riscos e estratégia recomendada",
    agent_type: "opportunity",
    entity_type: "opportunity",
    task: "Analisa esta oportunidade: probabilidade de fecho, riscos identificados, concorrência provável e estratégia recomendada para avançar.",
    icon: Briefcase,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "client-health",
    name: "Saúde do Cliente",
    description: "Satisfação, risco de churn e oportunidades de upsell",
    agent_type: "client",
    entity_type: "company",
    task: "Avalia a saúde deste cliente: nível de satisfação, sinais de churn, oportunidades de upsell/cross-sell e plano de ação preventivo.",
    icon: Building2,
    color: "text-violet-500 bg-violet-500/10",
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.bg, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function StatsBar() {
  const { data: stats, isLoading } = useAgentSystemStats();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>;
  if (!stats) return null;

  const items = [
    { label: "Pendentes", value: stats.pending_jobs, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "A executar", value: stats.running_jobs, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Hoje ✓", value: stats.completed_today, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Hoje ✗", value: stats.failed_today, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Agendamentos", value: stats.active_schedules, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Memória", value: stats.total_memory_entries, icon: Database, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Sucesso 7d", value: `${stats.success_rate_7d}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", item.bg)}>
                <Icon className={cn("h-4 w-4", item.color)} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{item.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function JobCard({ job }: { job: AIAgentJob }) {
  const navigate = useNavigate();
  const cancelJob = useCancelAgentJob();
  const canCancel = ['pending', 'queued', 'running'].includes(job.status);
  const EntityIcon = ENTITY_ICONS[job.entity_type || job.agent_type] || Cpu;
  const entityLabel = ENTITY_LABELS[job.entity_type || ''] || job.entity_type;

  const duration = job.completed_at && job.started_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
        onClick={() => navigate(`/dashboard/ai-agents/${job.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <EntityIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm truncate">
                    {job.name || job.task?.substring(0, 60) || `Análise de ${entityLabel}`}
                  </span>
                  <StatusBadge status={job.status} />
                  {job.priority >= 80 && <Badge variant="destructive" className="text-[10px] h-5">P{job.priority}</Badge>}
                </div>

                {job.task && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{job.task}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {job.agent_type}
                  </span>
                  <span className="flex items-center gap-1">
                    <EntityIcon className="h-3 w-3" />
                    {entityLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}
                  </span>
                  {duration !== null && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {duration}s
                    </span>
                  )}
                  {job.error_message && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {job.error_message.substring(0, 40)}
                    </span>
                  )}
                </div>

                {job.result_summary && (
                  <p className="text-xs mt-2 p-2 rounded bg-muted/50 line-clamp-2">{job.result_summary}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {canCancel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelJob.mutate(job.id);
                        }}
                      >
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancelar job</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// CREATE JOB DRAWER (with entity search)
// ============================================================================

function CreateJobDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: registry } = useAgentRegistry();
  const createJob = useCreateAgentJob();
  const { currentWorkspace } = useWorkspace();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [form, setForm] = useState({
    agent_type: 'lead',
    entity_type: 'lead',
    name: '',
    task: '',
    priority: 50,
    max_steps: 10,
    entity_id: '',
  });
  const [entitySearch, setEntitySearch] = useState('');
  const [entityResults, setEntityResults] = useState<Array<{ id: string; label: string }>>([]);
  const [searching, setSearching] = useState(false);

  const applyTemplate = (templateId: string) => {
    const tpl = JOB_TEMPLATES.find(t => t.id === templateId);
    if (tpl) {
      setSelectedTemplate(templateId);
      setForm(prev => ({
        ...prev,
        agent_type: tpl.agent_type,
        entity_type: tpl.entity_type,
        name: tpl.name,
        task: tpl.task,
      }));
    }
  };

  const searchEntities = async (query: string) => {
    if (!query.trim() || !currentWorkspace?.id) {
      setEntityResults([]);
      return;
    }
    setSearching(true);
    try {
      const tableMap: Record<string, string> = { lead: 'leads', contact: 'contacts', company: 'companies', opportunity: 'opportunities' };
      const table = tableMap[form.entity_type] || 'leads';
      const nameField = form.entity_type === 'opportunity' ? 'title' : 'name';

      const { data } = await supabase
        .from(table as any)
        .select(`id, ${nameField}`)
        .eq('workspace_id', currentWorkspace.id)
        .ilike(nameField, `%${query}%`)
        .limit(10) as any;

      setEntityResults((data || []).map((r: any) => ({
        id: r.id,
        label: r[nameField] || r.id,
      })));
    } catch {
      setEntityResults([]);
    }
    setSearching(false);
  };

  const handleSubmit = async () => {
    if (!form.entity_id) {
      toast.error("Seleciona uma entidade para analisar");
      return;
    }
    if (!form.task) {
      toast.error("Define a tarefa do agente");
      return;
    }
    try {
      await createJob.mutateAsync({
        agent_type: form.agent_type,
        name: form.name,
        task: form.task,
        priority: form.priority,
        max_steps: form.max_steps,
        target_entity_type: form.entity_type,
        target_entity_id: form.entity_id,
      });
      onOpenChange(false);
      resetForm();
    } catch {
      // Error handled by hook
    }
  };

  const resetForm = () => {
    setForm({ agent_type: 'lead', entity_type: 'lead', name: '', task: '', priority: 50, max_steps: 10, entity_id: '' });
    setSelectedTemplate(null);
    setEntitySearch('');
    setEntityResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Job de Agente IA
          </SheetTitle>
          <SheetDescription>
            Seleciona um template ou configura manualmente a análise
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Templates */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Templates rápidos</label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TEMPLATES.map(tpl => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      selectedTemplate === tpl.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mb-1", tpl.color.split(' ')[0])} />
                    <p className="text-xs font-semibold">{tpl.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Entity Type */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de Entidade</label>
            <Select value={form.entity_type} onValueChange={(v) => {
              setForm(p => ({ ...p, entity_type: v, agent_type: v === 'company' ? 'client' : v, entity_id: '' }));
              setEntitySearch('');
              setEntityResults([]);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="contact">Contacto</SelectItem>
                <SelectItem value="company">Empresa / Cliente</SelectItem>
                <SelectItem value="opportunity">Oportunidade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity Search */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {ENTITY_LABELS[form.entity_type] || 'Entidade'} a analisar *
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Pesquisar ${ENTITY_LABELS[form.entity_type]?.toLowerCase() || 'entidade'}...`}
                value={entitySearch}
                onChange={(e) => {
                  setEntitySearch(e.target.value);
                  searchEntities(e.target.value);
                }}
                className="pl-9"
              />
              {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Results */}
            {entityResults.length > 0 && (
              <div className="mt-1 border rounded-lg max-h-32 overflow-y-auto">
                {entityResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setForm(p => ({ ...p, entity_id: r.id }));
                      setEntitySearch(r.label);
                      setEntityResults([]);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2",
                      form.entity_id === r.id && "bg-primary/10"
                    )}
                  >
                    {React.createElement(ENTITY_ICONS[form.entity_type] || Target, { className: "h-3.5 w-3.5 text-muted-foreground" })}
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            )}

            {form.entity_id && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Entidade selecionada
              </p>
            )}
          </div>

          {/* Job Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome do Job</label>
            <Input
              placeholder="Ex: Análise de lead Q1"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Task */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tarefa / Instruções *</label>
            <Textarea
              placeholder="O que queres que o agente faça? Sê específico..."
              rows={4}
              value={form.task}
              onChange={e => setForm(p => ({ ...p, task: e.target.value }))}
            />
          </div>

          {/* Advanced options */}
          <details className="group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
              <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
              Opções avançadas
            </summary>
            <div className="mt-3 space-y-4 p-3 rounded-lg bg-muted/30 border">
              <div>
                <label className="text-xs font-medium">Prioridade: {form.priority}</label>
                <Slider
                  value={[form.priority]}
                  onValueChange={([v]) => setForm(p => ({ ...p, priority: v }))}
                  min={1} max={100} step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Baixa</span><span>Normal</span><span>Alta</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Max passos: {form.max_steps}</label>
                <Slider
                  value={[form.max_steps]}
                  onValueChange={([v]) => setForm(p => ({ ...p, max_steps: v }))}
                  min={1} max={20} step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </details>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createJob.isPending || !form.entity_id}>
            {createJob.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
            Criar e Executar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// TABS
// ============================================================================

function JobsTab({ statusFilter, searchQuery }: { statusFilter?: string; searchQuery: string }) {
  const { data: jobs, isLoading } = useAIAgentJobs(statusFilter ? { status: statusFilter } : undefined);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(j =>
      (j.name?.toLowerCase().includes(q)) ||
      (j.task?.toLowerCase().includes(q)) ||
      (j.agent_type?.toLowerCase().includes(q)) ||
      (j.entity_type?.toLowerCase().includes(q))
    );
  }, [jobs, searchQuery]);

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>;
  if (!filtered.length) return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-2xl bg-muted/50 mb-4">
          <Cpu className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold mb-1">
          {searchQuery ? 'Nenhum resultado' : 'Nenhum job encontrado'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {searchQuery
            ? 'Ajusta a pesquisa para encontrar jobs'
            : 'Cria um novo job para a IA analisar leads, contactos ou oportunidades automaticamente.'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {filtered.map(job => <JobCard key={job.id} job={job} />)}
      </AnimatePresence>
    </div>
  );
}

function SchedulesTab() {
  const { data: schedules, isLoading } = useAgentSchedules();
  if (isLoading) return <Skeleton className="h-48" />;
  if (!schedules?.length) return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
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
        <Card key={r.id} className={r.is_system ? 'border-primary/20' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                {r.display_name}
              </CardTitle>
              <div className="flex gap-1">
                {r.is_system && <Badge variant="outline" className="text-xs">Sistema</Badge>}
                <Badge variant={r.is_enabled ? "default" : "secondary"} className="text-xs">{r.is_enabled ? 'Ativo' : 'Inativo'}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">{r.description}</p>
            <div className="flex flex-wrap gap-1">
              {r.capabilities.slice(0, 4).map(c => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
              {r.capabilities.length > 4 && (
                <Badge variant="secondary" className="text-[10px]">+{r.capabilities.length - 4}</Badge>
              )}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
              <span>v{r.version}</span>
              <span>Max steps: {r.default_max_steps}</span>
              <span>Temp: {r.default_temperature}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AIAgentsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const runProcessor = useRunProcessor();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Agents</h1>
              <p className="text-muted-foreground text-sm">Orquestração distribuída de agentes IA autónomos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runProcessor.mutate()}
                    disabled={runProcessor.isPending}
                  >
                    {runProcessor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    Processar agora
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Executa todos os jobs pendentes imediatamente</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Job
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar />

        {/* Tabs + Toolbar */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="h-9">
              <TabsTrigger value="jobs" className="text-xs gap-1 px-3">
                <Play className="h-3 w-3" /> Jobs
              </TabsTrigger>
              <TabsTrigger value="schedules" className="text-xs gap-1 px-3">
                <Calendar className="h-3 w-3" /> Agendamentos
              </TabsTrigger>
              <TabsTrigger value="memory" className="text-xs gap-1 px-3">
                <Brain className="h-3 w-3" /> Memória
              </TabsTrigger>
              <TabsTrigger value="registry" className="text-xs gap-1 px-3">
                <BookOpen className="h-3 w-3" /> Registo
              </TabsTrigger>
            </TabsList>

            {activeTab === "jobs" && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-44 pl-8 text-xs"
                  />
                </div>
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-32 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="running">A executar</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="failed">Falhados</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="jobs" className="mt-4">
            <JobsTab statusFilter={statusFilter} searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="schedules" className="mt-4">
            <SchedulesTab />
          </TabsContent>
          <TabsContent value="memory" className="mt-4">
            <MemoryTab />
          </TabsContent>
          <TabsContent value="registry" className="mt-4">
            <RegistryTab />
          </TabsContent>
        </Tabs>
      </div>

      <CreateJobDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </DashboardLayout>
  );
}
