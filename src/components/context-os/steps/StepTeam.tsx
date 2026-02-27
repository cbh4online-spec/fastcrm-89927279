import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { TagInput } from "../TagInput";

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepTeam({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Tamanho da Equipa Comercial</Label>
        <Input
          type="number"
          value={data.team_size ?? ""}
          onChange={(e) => onChange({ team_size: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 5"
        />
      </div>

      <div className="space-y-2">
        <Label>Funções na Equipa</Label>
        <TagInput
          values={data.team_roles || []}
          onChange={(v) => onChange({ team_roles: v })}
          placeholder="Ex: Closer, SDR, Account Manager..."
        />
      </div>

      <div className="space-y-2">
        <Label>Estratégias Activas</Label>
        <TagInput
          values={data.active_strategies || []}
          onChange={(v) => onChange({ active_strategies: v })}
          placeholder="Ex: Outbound, Inbound, Referral, Parcerias..."
        />
      </div>
    </div>
  );
}
