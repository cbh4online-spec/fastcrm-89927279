import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Bell, Trash2, Pencil, Sparkles, Loader2 } from "lucide-react";
import { AlertChannel, PipelineMetric, MetricAlert } from "@/hooks/usePipelineMetrics";
import { ALERT_CHANNELS, ALERT_CONDITIONS } from "./constants";

interface AlertsTabProps {
  metrics: PipelineMetric[];
  alerts: MetricAlert[];
  createAlert: any;
  updateAlert: any;
  deleteAlert: any;
  aiAlertLoading: boolean;
  onAIAlertSuggest: () => void;
}

export function AlertsTab({
  metrics, alerts, createAlert, updateAlert, deleteAlert,
  aiAlertLoading, onAIAlertSuggest,
}: AlertsTabProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<MetricAlert | null>(null);
  const [aMetricId, setAMetricId] = useState("");
  const [aChannel, setAChannel] = useState<AlertChannel>("in_app");
  const [aCondition, setACondition] = useState("below_target");
  const [aThreshold, setAThreshold] = useState("80");
  const [aWebhook, setAWebhook] = useState("");

  const openEdit = (a: MetricAlert) => {
    setEditingAlert(a);
    setAMetricId(a.metric_id); setAChannel(a.channel); setACondition(a.condition);
    setAThreshold(String(a.threshold_pct)); setAWebhook(a.webhook_url || "");
    setAlertOpen(true);
  };

  const handleSave = () => {
    if (!aMetricId) return;
    const payload = {
      metric_id: aMetricId, channel: aChannel, condition: aCondition,
      threshold_pct: parseFloat(aThreshold),
      webhook_url: aChannel === "webhook" ? aWebhook.trim() : null,
    };
    const reset = () => { setEditingAlert(null); setAMetricId(""); setAThreshold("80"); setAWebhook(""); setACondition("below_target"); setAlertOpen(false); };

    if (editingAlert) {
      updateAlert.mutate({ id: editingAlert.id, ...payload }, { onSuccess: reset });
    } else {
      createAlert.mutate(payload, { onSuccess: reset });
    }
  };

  const isPending = createAlert.isPending || updateAlert.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onAIAlertSuggest} disabled={aiAlertLoading || metrics.length === 0}>
          {aiAlertLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Sugerir com IA
        </Button>
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
              <Button onClick={handleSave} disabled={isPending || !aMetricId} className="w-full">
                {isPending ? "A guardar..." : editingAlert ? "Guardar Alterações" : "Criar Alerta"}
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAlert.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
