import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, BarChart3, Target, Trash2, Filter, Pencil, Sparkles, Loader2, Check } from "lucide-react";
import { MetricType, MetricFormula, PipelineMetric, MetricTarget } from "@/hooks/usePipelineMetrics";
import { METRIC_TYPES, FORMULAS, SOURCE_TABLES, PERIODS, TYPE_COLORS, LEAD_STATUSES } from "./constants";

interface MetricsTabProps {
  metrics: PipelineMetric[];
  targets: MetricTarget[];
  metricsLoading: boolean;
  pipelines: any[] | undefined;
  stages: any[] | undefined;
  createMetric: any;
  updateMetric: any;
  deleteMetric: any;
  createTarget: any;
  aiLoading: boolean;
  onAISuggest: () => void;
}

export function MetricsTab({
  metrics, targets, metricsLoading, pipelines, stages,
  createMetric, updateMetric, deleteMetric, createTarget,
  aiLoading, onAISuggest,
}: MetricsTabProps) {
  const [metricOpen, setMetricOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PipelineMetric | null>(null);

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

  const resetForm = () => {
    setMName(""); setMDesc(""); setMType("volume"); setMFormula("count");
    setMSource("leads"); setMField(""); setMUnit("");
    setFPipelineId("__all__"); setFStageId("__all__"); setFStatus("__all__"); setFSource(""); setFChannel(""); setFEventType("");
    setEditingMetric(null);
  };

  const openEdit = (m: PipelineMetric) => {
    setEditingMetric(m);
    setMName(m.name); setMDesc(m.description || ""); setMType(m.metric_type); setMFormula(m.formula);
    setMSource(m.source_table); setMField(m.source_field || ""); setMUnit(m.unit);
    const f = m.filter_json || {};
    setFPipelineId((f as any).pipeline_id || "__all__"); setFStageId((f as any).stage_id || "__all__");
    setFStatus((f as any).status || "__all__"); setFSource((f as any).source || "");
    setFChannel((f as any).channel || ""); setFEventType((f as any).event_type || "");
    setMetricOpen(true);
  };

  const handleSave = () => {
    if (!mName.trim()) return;
    const filterJson: Record<string, unknown> = {};
    if (fPipelineId && fPipelineId !== "__all__") filterJson.pipeline_id = fPipelineId;
    if (fStageId && fStageId !== "__all__") filterJson.stage_id = fStageId;
    if (fStatus && fStatus !== "__all__") filterJson.status = fStatus;
    if (fSource) filterJson.source = fSource;
    if (fChannel) filterJson.channel = fChannel;
    if (fEventType) filterJson.event_type = fEventType;

    const payload = {
      name: mName.trim(), description: mDesc.trim() || null, metric_type: mType,
      formula: mFormula, source_table: mSource, source_field: mField.trim() || null,
      unit: mUnit.trim(), filter_json: filterJson,
    };

    if (editingMetric) {
      updateMetric.mutate({ id: editingMetric.id, ...payload }, { onSuccess: () => { resetForm(); setMetricOpen(false); } });
    } else {
      createMetric.mutate(payload, { onSuccess: () => { resetForm(); setMetricOpen(false); } });
    }
  };

  const activeFiltersCount = (filters: Record<string, unknown>) =>
    Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;

  const isPending = createMetric.isPending || updateMetric.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onAISuggest} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Sugerir com IA
        </Button>
        <Dialog open={metricOpen} onOpenChange={(open) => { setMetricOpen(open); if (!open) resetForm(); }}>
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
                <Accordion type="single" collapsible>
                  <AccordionItem value="filters" className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span>Filtros avançados</span>
                        {([fPipelineId, fStageId, fStatus].some(v => v && v !== "__all__") || fSource || fChannel || fEventType) && (
                          <Badge variant="secondary" className="text-xs">
                            {[fPipelineId !== "__all__" && fPipelineId, fStageId !== "__all__" && fStageId, fStatus !== "__all__" && fStatus, fSource, fChannel, fEventType].filter(Boolean).length} activo(s)
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
                <Button onClick={handleSave} disabled={isPending || !mName.trim()} className="w-full">
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
              <Button variant="outline" onClick={onAISuggest} disabled={aiLoading} className="gap-1.5">
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
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
    </div>
  );
}
