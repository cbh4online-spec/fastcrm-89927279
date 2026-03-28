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
import { Plus, BarChart3, TrendingUp, Clock, Target, Trash2, Bell, Zap, Filter, Shield } from "lucide-react";
import { usePipelineMetrics, MetricType, MetricFormula, MetricPeriod, AlertChannel } from "@/hooks/usePipelineMetrics";
import { usePipelines, usePipelineStagesEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSeedDefaultMetrics } from "@/hooks/useSeedDefaultMetrics";

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

export default function PipelineMetricsPage() {
  const { metrics, metricsLoading, targets, alerts, createMetric, createTarget, createAlert, deleteMetric } = usePipelineMetrics();
  useSeedDefaultMetrics();
  const { data: pipelines } = usePipelines();
  const { data: stages } = usePipelineStagesEnhanced();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [tab, setTab] = useState("metrics");
  const [metricOpen, setMetricOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  // Metric form
  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mType, setMType] = useState<MetricType>("volume");
  const [mFormula, setMFormula] = useState<MetricFormula>("count");
  const [mSource, setMSource] = useState("leads");
  const [mField, setMField] = useState("");
  const [mUnit, setMUnit] = useState("");
  // Filters
  const [fPipelineId, setFPipelineId] = useState("");
  const [fStageId, setFStageId] = useState("");
  const [fStatus, setFStatus] = useState("");
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
    setFPipelineId(""); setFStageId(""); setFStatus(""); setFSource(""); setFChannel(""); setFEventType("");
  };

  const handleCreateMetric = () => {
    if (!mName.trim()) return;
    const filterJson: Record<string, unknown> = {};
    if (fPipelineId) filterJson.pipeline_id = fPipelineId;
    if (fStageId) filterJson.stage_id = fStageId;
    if (fStatus) filterJson.status = fStatus;
    if (fSource) filterJson.source = fSource;
    if (fChannel) filterJson.channel = fChannel;
    if (fEventType) filterJson.event_type = fEventType;

    createMetric.mutate({
      name: mName.trim(),
      description: mDesc.trim() || null,
      metric_type: mType,
      formula: mFormula,
      source_table: mSource,
      source_field: mField.trim() || null,
      unit: mUnit.trim(),
      filter_json: filterJson,
    }, {
      onSuccess: () => { resetMetricForm(); setMetricOpen(false); },
    });
  };

  const handleCreateTarget = () => {
    if (!tMetricId || !tValue) return;
    createTarget.mutate({
      metric_id: tMetricId,
      period: tPeriod,
      target_value: parseFloat(tValue),
      pipeline_id: tPipelineId || null,
      stage_id: tStageId || null,
    }, {
      onSuccess: () => { setTMetricId(""); setTValue(""); setTPipelineId(""); setTStageId(""); setTargetOpen(false); },
    });
  };

  const handleCreateAlert = () => {
    if (!aMetricId) return;
    createAlert.mutate({
      metric_id: aMetricId,
      channel: aChannel,
      condition: aCondition,
      threshold_pct: parseFloat(aThreshold),
      webhook_url: aChannel === "webhook" ? aWebhook.trim() : null,
    }, {
      onSuccess: () => { setAMetricId(""); setAThreshold("80"); setAWebhook(""); setACondition("below_target"); setAlertOpen(false); },
    });
  };

  const activeFiltersCount = (filters: Record<string, unknown>) => {
    return Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;
  };

  return (
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
          <div className="flex justify-end">
            <Dialog open={metricOpen} onOpenChange={setMetricOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5"><Plus className="h-4 w-4" />Nova Métrica</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[85vh]">
                <DialogHeader><DialogTitle>Criar Métrica</DialogTitle></DialogHeader>
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
                                  <SelectItem value="">Todos</SelectItem>
                                  {(pipelines || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Fase / Stage</Label>
                              <Select value={fStageId} onValueChange={setFStageId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Todas</SelectItem>
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
                                  <SelectItem value="">Todos</SelectItem>
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

                    <Button onClick={handleCreateMetric} disabled={createMetric.isPending || !mName.trim()} className="w-full">
                      {createMetric.isPending ? "A criar..." : "Criar Métrica"}
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
                <p className="text-sm text-muted-foreground mb-4">Crie a primeira métrica para acompanhar o desempenho do pipeline</p>
                <Button onClick={() => setMetricOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Nova Métrica</Button>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => deleteMetric.mutate(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
          <div className="flex justify-end">
            <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5" disabled={metrics.length === 0}><Plus className="h-4 w-4" />Nova Meta</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Definir Meta</DialogTitle></DialogHeader>
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

                  <Button onClick={handleCreateTarget} disabled={createTarget.isPending || !tMetricId || !tValue} className="w-full">
                    {createTarget.isPending ? "A criar..." : "Definir Meta"}
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
            <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5" disabled={metrics.length === 0}><Plus className="h-4 w-4" />Novo Alerta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Alerta</DialogTitle></DialogHeader>
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
                  <Button onClick={handleCreateAlert} disabled={createAlert.isPending || !aMetricId} className="w-full">
                    {createAlert.isPending ? "A criar..." : "Criar Alerta"}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
