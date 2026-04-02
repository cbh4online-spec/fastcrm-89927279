import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Target, Trash2, Pencil, Shield, Sparkles, Loader2 } from "lucide-react";
import { MetricPeriod, PipelineMetric, MetricTarget } from "@/hooks/usePipelineMetrics";
import { PERIODS } from "./constants";

interface TargetsTabProps {
  metrics: PipelineMetric[];
  targets: MetricTarget[];
  pipelines: any[] | undefined;
  stages: any[] | undefined;
  createTarget: any;
  updateTarget: any;
  deleteTarget: any;
  aiLoading: boolean;
  onAISuggest: () => void;
}

export function TargetsTab({
  metrics, targets, pipelines, stages,
  createTarget, updateTarget, deleteTarget,
  aiLoading, onAISuggest,
}: TargetsTabProps) {
  const [targetOpen, setTargetOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MetricTarget | null>(null);
  const [tMetricId, setTMetricId] = useState("");
  const [tPeriod, setTPeriod] = useState<MetricPeriod>("monthly");
  const [tValue, setTValue] = useState("");
  const [tPipelineId, setTPipelineId] = useState("__all__");
  const [tStageId, setTStageId] = useState("__all__");

  const openEdit = (t: MetricTarget) => {
    setEditingTarget(t);
    setTMetricId(t.metric_id); setTPeriod(t.period); setTValue(String(t.target_value));
    setTPipelineId(t.pipeline_id || "__all__"); setTStageId(t.stage_id || "__all__");
    setTargetOpen(true);
  };

  const handleSave = () => {
    if (!tMetricId || !tValue) return;
    const payload = {
      metric_id: tMetricId, period: tPeriod, target_value: parseFloat(tValue),
      pipeline_id: tPipelineId !== "__all__" ? tPipelineId : null,
      stage_id: tStageId !== "__all__" ? tStageId : null,
    };
    const reset = () => { setEditingTarget(null); setTMetricId(""); setTValue(""); setTPipelineId("__all__"); setTStageId("__all__"); setTargetOpen(false); };

    if (editingTarget) {
      updateTarget.mutate({ id: editingTarget.id, ...payload }, { onSuccess: reset });
    } else {
      createTarget.mutate(payload, { onSuccess: reset });
    }
  };

  const isPending = createTarget.isPending || updateTarget.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onAISuggest} disabled={aiLoading}>
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
                      <SelectItem value="__all__">Todos</SelectItem>
                      {(pipelines || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fase / Stage</Label>
                  <Select value={tStageId} onValueChange={setTStageId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {(stages || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isPending || !tMetricId || !tValue} className="w-full">
                {isPending ? "A guardar..." : editingTarget ? "Guardar Alterações" : "Definir Meta"}
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
                    {pipeline ? pipeline.name : ""}{pipeline && stage ? " → " : ""}{stage ? stage.name : ""}{!pipeline && !stage ? "Global" : ""}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{t.target_value}{m?.unit}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(t.created_at).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTarget.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
