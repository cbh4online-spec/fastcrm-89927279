import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { TagInput } from "../TagInput";

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepSalesProcess({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Etapas do Processo Comercial</Label>
        <TagInput
          values={data.sales_process_steps || []}
          onChange={(v) => onChange({ sales_process_steps: v })}
          placeholder="Ex: Qualificação, Discovery Call, Proposta, Negociação, Fechamento"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ciclo de Venda (dias)</Label>
          <Input
            type="number"
            value={data.sales_cycle_days ?? ""}
            onChange={(e) => onChange({ sales_cycle_days: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ex: 30"
          />
        </div>
        <div className="space-y-2">
          <Label>SLA Follow-up (horas)</Label>
          <Input
            type="number"
            value={data.follow_up_sla_hours ?? ""}
            onChange={(e) => onChange({ follow_up_sla_hours: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ex: 24"
          />
        </div>
      </div>
    </div>
  );
}
