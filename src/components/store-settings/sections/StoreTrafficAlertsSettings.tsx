import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Plus, Trash2, Clock, TrendingDown, Eye, Users, MousePointerClick, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useTrafficAlertRules,
  useCreateTrafficAlertRule,
  useUpdateTrafficAlertRule,
  useDeleteTrafficAlertRule,
  useTrafficAlertLogs,
  useMarkAlertRead,
} from "@/hooks/useStoreTrafficAlerts";

const METRIC_OPTIONS = [
  { value: "sessions", label: "Sessões", icon: Users },
  { value: "views", label: "Page Views", icon: Eye },
  { value: "conversion_rate", label: "Taxa de Conversão (%)", icon: MousePointerClick },
  { value: "bounce_rate", label: "Bounce Rate (%)", icon: TrendingDown },
  { value: "avg_time", label: "Tempo Médio (seg)", icon: Timer },
];

const PERIOD_OPTIONS = [
  { value: "1", label: "1 hora" },
  { value: "6", label: "6 horas" },
  { value: "12", label: "12 horas" },
  { value: "24", label: "24 horas" },
  { value: "48", label: "48 horas" },
  { value: "168", label: "7 dias" },
];

export function StoreTrafficAlertsSettings() {
  const { data: rules, isLoading: rulesLoading } = useTrafficAlertRules();
  const { data: logs, isLoading: logsLoading } = useTrafficAlertLogs(20);
  const createRule = useCreateTrafficAlertRule();
  const updateRule = useUpdateTrafficAlertRule();
  const deleteRule = useDeleteTrafficAlertRule();
  const markRead = useMarkAlertRead();

  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    metric_type: "sessions",
    threshold_value: "10",
    comparison_period_hours: "24",
    comparison_type: "below",
    notify_email: "",
    cooldown_hours: "24",
  });

  const handleCreate = () => {
    createRule.mutate(
      {
        metric_type: newRule.metric_type,
        threshold_value: Number(newRule.threshold_value),
        comparison_period_hours: Number(newRule.comparison_period_hours),
        comparison_type: newRule.comparison_type,
        notify_email: newRule.notify_email || undefined,
        cooldown_hours: Number(newRule.cooldown_hours),
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setNewRule({
            metric_type: "sessions",
            threshold_value: "10",
            comparison_period_hours: "24",
            comparison_type: "below",
            notify_email: "",
            cooldown_hours: "24",
          });
        },
      }
    );
  };

  const getMetricIcon = (type: string) => {
    const opt = METRIC_OPTIONS.find((m) => m.value === type);
    return opt ? opt.icon : AlertTriangle;
  };

  const getMetricLabel = (type: string) => {
    return METRIC_OPTIONS.find((m) => m.value === type)?.label ?? type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Regras de Alerta de Tráfego
            </CardTitle>
            <CardDescription>
              Defina thresholds para receber alertas quando o tráfego da loja variar
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Regra
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Métrica</Label>
                    <Select
                      value={newRule.metric_type}
                      onValueChange={(v) => setNewRule((p) => ({ ...p, metric_type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRIC_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Condição</Label>
                    <Select
                      value={newRule.comparison_type}
                      onValueChange={(v) => setNewRule((p) => ({ ...p, comparison_type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="below">Abaixo de</SelectItem>
                        <SelectItem value="above">Acima de</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Threshold</Label>
                    <Input
                      type="number"
                      value={newRule.threshold_value}
                      onChange={(e) => setNewRule((p) => ({ ...p, threshold_value: e.target.value }))}
                      min={0}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Período de Comparação</Label>
                    <Select
                      value={newRule.comparison_period_hours}
                      onValueChange={(v) => setNewRule((p) => ({ ...p, comparison_period_hours: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Cooldown (horas)</Label>
                    <Input
                      type="number"
                      value={newRule.cooldown_hours}
                      onChange={(e) => setNewRule((p) => ({ ...p, cooldown_hours: e.target.value }))}
                      min={1}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email (opcional)</Label>
                    <Input
                      type="email"
                      value={newRule.notify_email}
                      onChange={(e) => setNewRule((p) => ({ ...p, notify_email: e.target.value }))}
                      placeholder="admin@empresa.com"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={createRule.isPending}>
                    Criar Regra
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rulesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule) => {
                const MetricIcon = getMetricIcon(rule.metric_type);
                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <MetricIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {getMetricLabel(rule.metric_type)}{" "}
                        <span className="text-muted-foreground font-normal">
                          {rule.comparison_type === "below" ? "< " : "> "}
                          {rule.threshold_value}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Período: {rule.comparison_period_hours}h · Cooldown: {rule.cooldown_hours}h
                        {rule.notify_email && ` · ${rule.notify_email}`}
                      </p>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        updateRule.mutate({ id: rule.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteRule.mutate(rule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sem regras configuradas. Crie uma para começar a monitorizar o tráfego.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Histórico de Alertas
          </CardTitle>
          <CardDescription>Alertas de tráfego disparados recentemente</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    log.is_read ? "bg-card" : "bg-warning/5 border-warning/20"
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      log.is_read ? "text-muted-foreground" : "text-warning"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {getMetricLabel(log.metric_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {formatDistanceToNow(new Date(log.created_at), {
                          locale: pt,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {!log.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => markRead.mutate(log.id)}
                    >
                      Marcar lido
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sem alertas disparados. Os alertas aparecerão aqui quando o tráfego violar um threshold.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
