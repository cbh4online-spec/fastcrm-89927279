import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentOpsSettings, useUpdateAgentOpsSettings } from "@/hooks/useTeamPerformance";
import { Loader2 } from "lucide-react";

export function TeamOpsSettingsCard() {
  const { data: settings, isLoading } = useAgentOpsSettings();
  const update = useUpdateAgentOpsSettings();

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const s = settings || ({
    auto_distribution_method: "manual",
    unanswered_alert_minutes: 15,
    include_tickets_in_workload: true,
    include_followups_in_workload: true,
    quality_score_enabled: false,
    coaching_ai_enabled: false,
    show_ranking: false,
    individual_metrics_managers_only: true,
  } as any);

  const set = (patch: Record<string, any>) => update.mutate(patch);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Equipa e Performance</h3>
        <p className="text-xs text-muted-foreground">
          Configurações de distribuição, carga, qualidade e coaching IA.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs">Método de distribuição automática</Label>
          <Select
            value={s.auto_distribution_method}
            onValueChange={(v) => set({ auto_distribution_method: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (recomendado)</SelectItem>
              <SelectItem value="round_robin">Rodízio (round robin)</SelectItem>
              <SelectItem value="least_loaded">Menos carregado</SelectItem>
              <SelectItem value="skill_based">Por competência (em preparação)</SelectItem>
              <SelectItem value="priority_based">Por prioridade (em preparação)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Manual por defeito. As regras de routing já configuradas continuam a funcionar.
          </p>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs" htmlFor="alert_minutes">
            Alertar conversas sem resposta após (minutos)
          </Label>
          <Input
            id="alert_minutes"
            type="number"
            min={1}
            max={1440}
            value={s.unanswered_alert_minutes ?? 15}
            onChange={(e) => set({ unanswered_alert_minutes: parseInt(e.target.value) || 15 })}
            className="h-9 w-32"
          />
        </div>

        <SettingRow
          label="Incluir tickets no cálculo da carga"
          checked={!!s.include_tickets_in_workload}
          onCheckedChange={(v) => set({ include_tickets_in_workload: v })}
        />
        <SettingRow
          label="Incluir follow-ups no cálculo da carga"
          checked={!!s.include_followups_in_workload}
          onCheckedChange={(v) => set({ include_followups_in_workload: v })}
        />
        <SettingRow
          label="Score de qualidade experimental"
          description="Cálculo baseado em sinais operacionais. Apoio à gestão, não avaliação isolada."
          checked={!!s.quality_score_enabled}
          onCheckedChange={(v) => set({ quality_score_enabled: v })}
        />
        <SettingRow
          label="Coaching IA"
          description="Permite analisar conversa individual com IA para identificar pontos de melhoria."
          checked={!!s.coaching_ai_enabled}
          onCheckedChange={(v) => set({ coaching_ai_enabled: v })}
        />
        <SettingRow
          label="Mostrar ranking de agentes"
          description="Desligado por defeito para evitar gamificação tóxica."
          checked={!!s.show_ranking}
          onCheckedChange={(v) => set({ show_ranking: v })}
        />
        <SettingRow
          label="Métricas individuais apenas para gestores/admins"
          checked={!!s.individual_metrics_managers_only}
          onCheckedChange={(v) => set({ individual_metrics_managers_only: v })}
        />
      </div>
    </Card>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-t first:border-t-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
