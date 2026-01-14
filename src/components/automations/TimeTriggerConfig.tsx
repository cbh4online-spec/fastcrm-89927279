import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Calendar, Timer } from "lucide-react";
import { AutomationTrigger } from "@/hooks/useAutomations";

interface TriggerConfig {
  no_response_hours?: number;
  scheduled_date?: string;
  delay_hours?: number;
  delay_days?: number;
}

interface TimeTriggerConfigProps {
  trigger: AutomationTrigger;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function TimeTriggerConfig({ trigger, config, onChange }: TimeTriggerConfigProps) {
  if (trigger === "lead_no_response" || trigger === "conversation_no_reply") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Timer className="h-4 w-4 text-orange-500" />
          Configuração de Tempo
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Sem resposta há</Label>
            <Input
              type="number"
              min={1}
              className="w-24"
              placeholder="24"
              value={config.no_response_hours || ""}
              onChange={(e) =>
                onChange({ ...config, no_response_hours: parseInt(e.target.value) || undefined })
              }
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A automação será ativada quando não houver resposta pelo tempo especificado.
          </p>
        </div>
      </Card>
    );
  }

  if (trigger === "scheduled_time") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          Agendamento
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Input
              type="datetime-local"
              value={config.scheduled_date || ""}
              onChange={(e) =>
                onChange({ ...config, scheduled_date: e.target.value })
              }
            />
          </div>

          <p className="text-xs text-muted-foreground">
            A automação será executada na data e hora especificadas.
          </p>
        </div>
      </Card>
    );
  }

  return null;
}

// Helper to format time config in plain language
export function formatTimeConfig(trigger: AutomationTrigger, config?: TriggerConfig): string {
  if (!config) return "";

  if (trigger === "lead_no_response" || trigger === "conversation_no_reply") {
    const hours = config.no_response_hours;
    if (!hours) return "";
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `após ${days} dia${days > 1 ? "s" : ""}`;
      }
      return `após ${days}d ${remainingHours}h`;
    }
    return `após ${hours} hora${hours > 1 ? "s" : ""}`;
  }

  if (trigger === "scheduled_time" && config.scheduled_date) {
    const date = new Date(config.scheduled_date);
    return `em ${date.toLocaleDateString("pt-PT")} às ${date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return "";
}
