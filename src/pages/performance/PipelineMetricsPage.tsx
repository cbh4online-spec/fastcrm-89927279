import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BarChart3, TrendingUp, Clock, Target, Trash2, Bell, Zap, Filter, Shield, Pencil, Sparkles, Loader2, Check } from "lucide-react";
import { usePipelineMetrics, MetricType, MetricFormula, MetricPeriod, AlertChannel, PipelineMetric, MetricTarget, MetricAlert } from "@/hooks/usePipelineMetrics";
import { usePipelines, usePipelineStagesEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSeedDefaultMetrics } from "@/hooks/useSeedDefaultMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const METRIC_TYPES: { value: MetricType; label: string; icon: typeof BarChart3 }[] = [
  { value: "volume", label: "Volume", icon: BarChart3 },
  { value: "value", label: "Valor", icon: TrendingUp },
  { value: "conversion", label: "Conversão", icon: Target },
  { value: "time", label: "Tempo", icon: Clock },
  { value: "quality", label: "Qualidade", icon: Zap },
  { value: "custom", label: "Customizada", icon: BarChart3 },
];

const FORMULAS: { value: MetricFormula; label: string; hint: string }[] = [
  { value: "count", label: "Contagem", hint: "Conta o número de registos" },
  { value: "sum", label: "Soma", hint: "Soma o valor de um campo" },
  { value: "avg", label: "Média", hint: "Média do valor de um campo" },
  { value: "percentage", label: "Percentagem", hint: "% de registos com valor > 0" },
  { value: "duration", label: "Duração", hint: "Média de duração em dias" },
  { value: "event_count", label: "Eventos", hint: "Conta eventos do Kernel" },
];

const SOURCE_TABLES = [
  { value: "leads", label: "Leads" },
  { value: "opportunities", label: "Negócios" },
  { value: "contacts", label: "Contactos" },
  { value: "companies", label: "Empresas" },
  { value: "tasks", label: "Tarefas" },
  { value: "messages", label: "Mensagens" },
  { value: "kernel_events", label: "Eventos Kernel" },
  { value: "activity_logs", label: "Atividades" },
];

const PERIODS: { value: MetricPeriod; label: string }[] = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
];

const ALERT_CHANNELS: { value: AlertChannel; label: string }[] = [
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "webhook", label: "Webhook" },
];

const ALERT_CONDITIONS = [
  { value: "below_target", label: "Abaixo da meta" },
  { value: "above_target", label: "Acima da meta" },
  { value: "sla_breach", label: "Violação de SLA" },
  { value: "trend_down", label: "Tendência negativa" },
];

const LEAD_STATUSES = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

const TYPE_COLORS: Record<MetricType, string> = {
  volume: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  value: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  conversion: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  time: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  quality: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  custom: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

interface AISuggestion {
  name: string;
  description: string;
  metric_type: MetricType;
  formula: MetricFormula;
  source_table: string;
  source_field: string | null;
  unit: string;
  target_value?: number;
  target_period?: MetricPeriod;
  reasoning: string;
}

export default function PipelineMetricsPage() {
  const {
    metrics, metricsLoading, targets, alerts,
    createMetric, updateMetric, deleteMetric,
    createTarget, updateTarget, deleteTarget,
    createAlert, updateAlert, deleteAlert,
  } = usePipelineMetrics();
  useSeedDefaultMetrics();
  const { data: pipelines } = usePipelines();
  const { data: stages } = usePipelineStagesEnhanced();
  const { currentWorkspace } = useWorkspace();

  const [tab, setTab] = useState("metrics");
  const [metricOpen, setMetricOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  // Edit state
  const [editingMetric, setEditingMetric] = useState<PipelineMetric | null>(null);
  const [editingTarget, setEditingTarget] = useState<MetricTarget | null>(null);
  const [editingAlert, setEditingAlert] = useState<MetricAlert | null>(null);

  // AI suggestions
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiOpen, setAiOpen] = useState(false);

  // Metric form
  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mType, setMType] = useState<MetricType>("volume");
  const [mFormula, setMFormula] = useState<MetricFormula>("count");
  const [mSource, setMSource] = useState("leads");
  const [mField, setMField] = useState("");
  const [mUnit, setMUnit] = useState("");
  const [fPipelineId, setFPipelineId] = useState("__all__");
  const [fStageId, setFStageId] = useState("__all__");
  const [fStatus, setFStatus] = useState("__all__");
  const [fSource, setFSource] = useState("");
  const [fChannel, setFChannel] = useState("");
  const [fEventType, setFEventType] = useState("");

  // Target form
  const [tMetricId, setTMetricId] = useState("");
  const [tPeriod, setTPeriod] = useState<MetricPeriod>("monthly");
  const [tValue, setTValue] = useState("");
  const [tPipelineId, setTPipelineId] = useState("");
  const [tStageId, setTStageId] = useState("");

  // Alert form
  const [aMetricId, setAMetricId] = useState("");
  const [aChannel, setAChannel] = useState<AlertChannel>("in_app");
  const [aCondition, setACondition] = useState("below_target");
  const [aThreshold, setAThreshold] = useState("80");
  const [aWebhook, setAWebhook] = useState("");

  const resetMetricForm = () => {
    setMName(""); setMDesc(""); setMType("volume"); setMFormula("count");
    setMSource("leads"); setMField(""); setMUnit("");
    setFPipelineId("__all__"); setFStageId("__all__"); setFStatus("__all__"); setFSource(""); setFChannel(""); setFEventType("");
    setEditingMetric(null);
  };

  const openEditMetric = (m: PipelineMetric) => {
    setEditingMetric(m);
    setMName(m.name);
    setMDesc(m.description || "");
    setMType(m.metric_type);
    setMFormula(m.formula);
    setMSource(m.source_table);
    setMField(m.source_field || "");
    setMUnit(m.unit);
    const f = m.filter_json || {};
    setFPipelineId((f as any).pipeline_id || "__all__");
    setFStageId((f as any).stage_id || "__all__");
    setFStatus((f as any).status || "__all__");
    setFSource((f as any).source || "");
    setFChannel((f as any).channel || "");
    setFEventType((f as any).event_type || "");
    setMetricOpen(true);
  };

  const openEditTarget = (t: MetricTarget) => {
    setEditingTarget(t);
    setTMetricId(t.metric_id);
    setTPeriod(t.period);
    setTValue(String(t.target_value));
    setTPipelineId(t.pipeline_id || "");
    setTStageId(t.stage_id || "");
    setTargetOpen(true);
  };

  const openEditAlert = (a: MetricAlert) => {
    setEditingAlert(a);
    setAMetricId(a.metric_id);
    setAChannel(a.channel);
    setACondition(a.condition);
    setAThreshold(String(a.threshold_pct));
    setAWebhook(a.webhook_url || "");
    setAlertOpen(true);
  };

  const handleSaveMetric = () => {
    if (!mName.trim()) return;
    const filterJson: Record<string, unknown> = {};
    if (fPipelineId && fPipelineId !== "__all__") filterJson.pipeline_id = fPipelineId;
    if (fStageId && fStageId !== "__all__") filterJson.stage_id = fStageId;
    if (fStatus && fStatus !== "__all__") filterJson.status = fStatus;
    if (fSource) filterJson.source = fSource;
    if (fChannel) filterJson.channel = fChannel;
    if (fEventType) filterJson.event_type = fEventType;

    const payload = {
      name: mName.trim(),
      description: mDesc.trim() || null,
      metric_type: mType,
      formula: mFormula,
      source_table: mSource,
      source_field: mField.trim() || null,
      unit: mUnit.trim(),
      filter_json: filterJson,
    };

    if (editingMetric) {
      updateMetric.mutate({ id: editingMetric.id, ...payload }, {
        onSuccess: () => { resetMetricForm(); setMetricOpen(false); },
      });
    } else {
      createMetric.mutate(payload, {
        onSuccess: () => { resetMetricForm(); setMetricOpen(false); },
      });
    }
  };

  const handleSaveTarget = () => {
    if (!tMetricId || !tValue) return;
    const payload = {
      metric_id: tMetricId,
      period: tPeriod,
      target_value: parseFloat(tValue),
      pipeline_id: tPipelineId || null,
      stage_id: tStageId || null,
    };

    if (editingTarget) {
      updateTarget.mutate({ id: editingTarget.id, ...payload }, {
        onSuccess: () => { setEditingTarget(null); setTMetricId(""); setTValue(""); setTPipelineId(""); setTStageId(""); setTargetOpen(false); },
      });
    } else {
      createTarget.mutate(payload, {
        onSuccess: () => { setTMetricId(""); setTValue(""); setTPipelineId(""); setTStageId(""); setTargetOpen(false); },
      });
    }
  };

  const handleSaveAlert = () => {
    if (!aMetricId) return;
    const payload = {
      metric_id: aMetricId,
      channel: aChannel,
      condition: aCondition,
      threshold_pct: parseFloat(aThreshold),
      webhook_url: aChannel === "webhook" ? aWebhook.trim() : null,
    };

    if (editingAlert) {
      updateAlert.mutate({ id: editingAlert.id, ...payload }, {
        onSuccess: () => { setEditingAlert(null); setAMetricId(""); setAThreshold("80"); setAWebhook(""); setACondition("below_target"); setAlertOpen(false); },
      });
    } else {
      createAlert.mutate(payload, {
        onSuccess: () => { setAMetricId(""); setAThreshold("80"); setAWebhook(""); setACondition("below_target"); setAlertOpen(false); },
      });
    }
  };

  const handleAISuggest = async () => {
    if (!currentWorkspace?.id) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("context-ai-assist", {
        body: { action: "suggest_metrics_and_targets", workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiSuggestions(data.suggestions || []);
      setAiOpen(true);
    } catch (e: any) {
      toast.error("Erro IA: " + (e.message || "Erro desconhecido"));
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestion = (s: AISuggestion) => {
    createMetric.mutate({
      name: s.name,
      description: s.description,
      metric_type: s.metric_type,
      formula: s.formula,
      source_table: s.source_table,
      source_field: s.source_field,
      unit: s.unit,
      filter_json: {},
    }, {
      onSuccess: (created: any) => {
        if (s.target_value && created?.id) {
          createTarget.mutate({
            metric_id: created.id,
            period: s.target_period || "monthly",
            target_value: s.target_value,
          });
        }
        setAiSuggestions(prev => prev.filter(x => x.name !== s.name));
        toast.success(`Métrica "${s.name}" adicionada`);
      },
    });
  };

  const activeFiltersCount = (filters: Record<string, unknown>) => {
    return Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;
  };

  const isPending = createMetric.isPending || updateMetric.isPending;
  const isTargetPending = createTarget.isPending || updateTarget.isPending;
  const isAlertPending = createAlert.isPending || updateAlert.isPending;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas & Metas</h1>
          <p className="text-sm text-muted-foreground">Configure métricas customizadas, metas e alertas para o pipeline</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="metrics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Métricas ({metrics.length})</TabsTrigger>
          <TabsTrigger value="targets" className="gap-1.5"><Target className="h-4 w-4" />Metas ({targets.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5"><Bell className="h-4 w-4" />Alertas ({alerts.length})</TabsTrigger>
        </TabsList>

        {/* ===== METRICS TAB ===== */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleAISuggest} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Sugerir com IA
            </Button>
            <Dialog open={metricOpen} onOpenChange={(open) => { setMetricOpen(open); if (!open) resetMetricForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-1.5"><Plus className="h-4 w-4" />Nova Métrica</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[85vh]">
                <DialogHeader><DialogTitle>{editingMetric ? "Editar Métrica" : "Criar Métrica"}</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="space-y-4">
                    <div><Label>Nome *</Label><Input value={mName} onChange={e => setMName(e.target.value)} placeholder="ex: Leads criados por semana" /></div>
                    <div><Label>Descrição</Label><Textarea value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Descrição opcional..." rows={2} /></div>

                    <Separator />
                    <h4 className="text-sm font-semibold text-foreground">Definição</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={mType} onValueChange={v => setMType(v as MetricType)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{METRIC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Fórmula</Label>
                        <Select value={mFormula} onValueChange={v => setMFormula(v as MetricFormula)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FORMULAS.map(f => (
                            <SelectItem key={f.value} value={f.value}>
                              <div><span>{f.label}</span><span className="text-xs text-muted-foreground ml-1">— {f.hint}</span></div>
                            </SelectItem>
                          ))}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Fonte de dados</Label>
                        <Select value={mSource} onValueChange={setMSource}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{SOURCE_TABLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Campo (soma/média)</Label>
                        <Input value={mField} onChange={e => setMField(e.target.value)} placeholder="ex: total_value" />
                      </div>
                    </div>

                    <div><Label>Unidade</Label><Input value={mUnit} onChange={e => setMUnit(e.target.value)} placeholder="ex: €, %, dias, leads" /></div>

                    {/* === FILTERS === */}
                    <Accordion type="single" collapsible>
                      <AccordionItem value="filters" className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm py-2">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span>Filtros avançados</span>
                            {(fPipelineId || fStageId || fStatus || fSource || fChannel || fEventType) && (
                              <Badge variant="secondary" className="text-xs">
                                {[fPipelineId, fStageId, fStatus, fSource, fChannel, fEventType].filter(Boolean).length} activo(s)
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pb-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Pipeline</Label>
                              <Select value={fPipelineId} onValueChange={setFPipelineId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todos</SelectItem>
                                  {(pipelines || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Fase / Stage</Label>
                              <Select value={fStageId} onValueChange={setFStageId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todas</SelectItem>
                                  {(stages || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Estado</Label>
                              <Select value={fStatus} onValueChange={setFStatus}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todos</SelectItem>
                                  {LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Origem</Label>
                              <Input value={fSource} onChange={e => setFSource(e.target.value)} placeholder="ex: website, referral" className="h-8 text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Canal</Label>
                              <Input value={fChannel} onChange={e => setFChannel(e.target.value)} placeholder="ex: email, phone" className="h-8 text-xs" />
                            </div>
                            {mSource === "kernel_events" && (
                              <div>
                                <Label className="text-xs">Tipo de evento</Label>
                                <Input value={fEventType} onChange={e => setFEventType(e.target.value)} placeholder="ex: lead.created" className="h-8 text-xs" />
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Button onClick={handleSaveMetric} disabled={isPending || !mName.trim()} className="w-full">
                      {isPending ? "A guardar..." : editingMetric ? "Guardar Alterações" : "Criar Métrica"}
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          {metricsLoading ? (
            <div className="text-center py-12 text-muted-foreground">A carregar métricas...</div>
          ) : metrics.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Sem métricas configuradas</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie a primeira métrica ou peça sugestões à IA</p>
                <div className="flex gap-2">
                  <Button onClick={() => setMetricOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Nova Métrica</Button>
                  <Button variant="outline" onClick={handleAISuggest} disabled={aiLoading} className="gap-1.5">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Sugerir com IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map(m => {
                const t = targets.find(t => t.metric_id === m.id);
                const filterCount = activeFiltersCount(m.filter_json || {});
                return (
                  <Card key={m.id} className="group relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={TYPE_COLORS[m.metric_type]}>{METRIC_TYPES.find(t => t.value === m.metric_type)?.label}</Badge>
                          <Badge variant="outline" className="text-xs">{FORMULAS.find(f => f.value === m.formula)?.label}</Badge>
                          {filterCount > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1"><Filter className="h-2.5 w-2.5" />{filterCount}</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMetric(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMetric.mutate(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-base mt-2">{m.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {m.description && <p className="text-xs text-muted-foreground mb-2">{m.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Fonte: {SOURCE_TABLES.find(s => s.value === m.source_table)?.label || m.source_table}</span>
                        {m.source_field && <span>Campo: {m.source_field}</span>}
                        {m.unit && <span>Unidade: {m.unit}</span>}
                      </div>
                      {t && (
                        <div className="mt-3 flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium text-primary">Meta: {t.target_value}{m.unit}</span>
                          <Badge variant="outline" className="text-xs">{PERIODS.find(p => p.value === t.period)?.label}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== TARGETS TAB ===== */}
        <TabsContent value="targets" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleAISuggest} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Sugerir com IA
            </Button>
            <Dialog open={targetOpen} onOpenChange={(open) => { setTargetOpen(open); if (!open) setEditingTarget(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-1.5" disabled={metrics.length === 0}><Plus className="h-4 w-4" />Nova Meta</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{editingTarget ? "Editar Meta" : "Definir Meta"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Métrica *</Label>
                    <Select value={tMetricId} onValueChange={setTMetricId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{metrics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Período *</Label>
                      <Select value={tPeriod} onValueChange={v => setTPeriod(v as MetricPeriod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor da Meta *</Label>
                      <Input type="number" value={tValue} onChange={e => setTValue(e.target.value)} placeholder="ex: 100" />
                    </div>
                  </div>

                  <Separator />
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />Âmbito (opcional)
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Pipeline</Label>
                      <Select value={tPipelineId} onValueChange={setTPipelineId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          {(pipelines || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Fase / Stage</Label>
                      <Select value={tStageId} onValueChange={setTStageId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {(stages || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleSaveTarget} disabled={isTargetPending || !tMetricId || !tValue} className="w-full">
                    {isTargetPending ? "A guardar..." : editingTarget ? "Guardar Alterações" : "Definir Meta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {targets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Sem metas definidas</h3>
                <p className="text-sm text-muted-foreground">Defina metas para acompanhar o progresso das métricas</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Âmbito</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map(t => {
                  const m = metrics.find(m => m.id === t.metric_id);
                  const pipeline = (pipelines || []).find((p: any) => p.id === t.pipeline_id);
                  const stage = (stages || []).find((s: any) => s.id === t.stage_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{PERIODS.find(p => p.value === t.period)?.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pipeline ? pipeline.name : ""}
                        {pipeline && stage ? " → " : ""}
                        {stage ? stage.name : ""}
                        {!pipeline && !stage ? "Global" : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{t.target_value}{m?.unit}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(t.created_at).toLocaleDateString("pt-PT")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTarget(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTarget.mutate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ===== ALERTS TAB ===== */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={alertOpen} onOpenChange={(open) => { setAlertOpen(open); if (!open) setEditingAlert(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-1.5" disabled={metrics.length === 0}><Plus className="h-4 w-4" />Novo Alerta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingAlert ? "Editar Alerta" : "Criar Alerta"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Métrica *</Label>
                    <Select value={aMetricId} onValueChange={setAMetricId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{metrics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Condição</Label>
                    <Select value={aCondition} onValueChange={setACondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ALERT_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Canal</Label>
                      <Select value={aChannel} onValueChange={v => setAChannel(v as AlertChannel)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ALERT_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Threshold (%)</Label>
                      <Input type="number" value={aThreshold} onChange={e => setAThreshold(e.target.value)} placeholder="80" />
                    </div>
                  </div>
                  {aChannel === "webhook" && (
                    <div><Label>Webhook URL</Label><Input value={aWebhook} onChange={e => setAWebhook(e.target.value)} placeholder="https://..." /></div>
                  )}
                  <Button onClick={handleSaveAlert} disabled={isAlertPending || !aMetricId} className="w-full">
                    {isAlertPending ? "A guardar..." : editingAlert ? "Guardar Alterações" : "Criar Alerta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {alerts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Sem alertas configurados</h3>
                <p className="text-sm text-muted-foreground">Configure alertas para ser notificado quando uma métrica ultrapassa o limite</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Último disparo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(a => {
                  const m = metrics.find(m => m.id === a.metric_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{ALERT_CONDITIONS.find(c => c.value === a.condition)?.label || a.condition}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{ALERT_CHANNELS.find(c => c.value === a.channel)?.label}</Badge></TableCell>
                      <TableCell>{a.threshold_pct}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.last_triggered_at ? new Date(a.last_triggered_at).toLocaleDateString("pt-PT") : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAlert(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAlert.mutate(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== AI SUGGESTIONS DIALOG ===== */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões IA — Context OS
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {aiSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem sugestões disponíveis. Preencha mais dados no Context OS para obter melhores sugestões.</p>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((s, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-sm">{s.name}</h4>
                          <Badge className={TYPE_COLORS[s.metric_type] || ""}>{METRIC_TYPES.find(t => t.value === s.metric_type)?.label || s.metric_type}</Badge>
                          {s.target_value && <Badge variant="outline" className="text-xs">Meta: {s.target_value}{s.unit}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{s.description}</p>
                        <p className="text-xs text-muted-foreground/70 italic">{s.reasoning}</p>
                      </div>
                      <Button size="sm" className="gap-1 shrink-0" onClick={() => acceptSuggestion(s)} disabled={createMetric.isPending}>
                        <Check className="h-3.5 w-3.5" />Adicionar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
