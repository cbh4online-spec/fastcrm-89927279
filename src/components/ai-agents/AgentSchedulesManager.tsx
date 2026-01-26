import { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgentSchedules } from "@/hooks/useAgentSchedules";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

interface CreateScheduleForm {
  name: string;
  description: string;
  agentType: string;
  cronPreset: string;
  customCron: string;
  maxEntitiesPerRun: number;
}

const CRON_PRESETS = [
  { label: "Diário às 9h", value: "0 9 * * *" },
  { label: "Diário às 14h", value: "0 14 * * *" },
  { label: "Segunda-feira às 9h", value: "0 9 * * 1" },
  { label: "Sexta-feira às 17h", value: "0 17 * * 5" },
  { label: "A cada 6 horas", value: "0 */6 * * *" },
  { label: "Personalizado", value: "custom" },
];

const AGENT_TYPES = [
  { label: "Lead Agent", value: "lead", description: "Análise de leads" },
  { label: "Opportunity Agent", value: "opportunity", description: "Análise de oportunidades" },
  { label: "Client Agent", value: "client", description: "Saúde de clientes" },
  { label: "Contact Agent", value: "contact", description: "Enriquecimento de contactos" },
];

export function AgentSchedulesManager() {
  const {
    schedules,
    isLoading,
    create,
    update,
    delete: deleteSchedule,
    toggle,
    isCreating,
    isDeleting,
  } = useAgentSchedules();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateScheduleForm>({
    name: "",
    description: "",
    agentType: "lead",
    cronPreset: "0 9 * * *",
    customCron: "",
    maxEntitiesPerRun: 50,
  });

  const handleCreate = async () => {
    const cronExpression =
      form.cronPreset === "custom" ? form.customCron : form.cronPreset;

    await create({
      name: form.name,
      description: form.description || undefined,
      agentType: form.agentType,
      cronExpression,
      maxEntitiesPerRun: form.maxEntitiesPerRun,
    });

    setShowCreateDialog(false);
    setForm({
      name: "",
      description: "",
      agentType: "lead",
      cronPreset: "0 9 * * *",
      customCron: "",
      maxEntitiesPerRun: 50,
    });
  };

  const getCronDescription = (cron: string) => {
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    if (preset && preset.value !== "custom") return preset.label;
    return cron;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos de Análise IA
          </CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">
                Nenhum agendamento configurado
              </p>
              <p className="text-sm text-muted-foreground">
                Configure análises automáticas para leads, oportunidades e
                clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={schedule.isEnabled}
                      onCheckedChange={(enabled) => toggle(schedule.id, enabled)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{schedule.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {AGENT_TYPES.find((a) => a.value === schedule.agentType)?.label ||
                            schedule.agentType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getCronDescription(schedule.cronExpression)}
                        </span>
                        {schedule.nextRunAt && schedule.isEnabled && (
                          <span>
                            Próxima execução:{" "}
                            {formatDistanceToNow(new Date(schedule.nextRunAt), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                        )}
                        {schedule.lastRunAt && (
                          <span>
                            Última:{" "}
                            {format(new Date(schedule.lastRunAt), "dd/MM HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento de Análise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agendamento</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Análise diária de leads inativos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descreva o objetivo deste agendamento..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Agente</Label>
              <Select
                value={form.agentType}
                onValueChange={(value) => setForm({ ...form, agentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((agent) => (
                    <SelectItem key={agent.value} value={agent.value}>
                      <div>
                        <div>{agent.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {agent.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={form.cronPreset}
                onValueChange={(value) =>
                  setForm({ ...form, cronPreset: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.cronPreset === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customCron">Expressão Cron</Label>
                <Input
                  id="customCron"
                  value={form.customCron}
                  onChange={(e) =>
                    setForm({ ...form, customCron: e.target.value })
                  }
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: minuto hora dia mês dia_semana
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maxEntities">Máximo de entidades por execução</Label>
              <Input
                id="maxEntities"
                type="number"
                min={1}
                max={200}
                value={form.maxEntitiesPerRun}
                onChange={(e) =>
                  setForm({ ...form, maxEntitiesPerRun: parseInt(e.target.value) || 50 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.name || isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
