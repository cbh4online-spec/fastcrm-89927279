import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepGoals({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Meta Mensal (€)</Label>
          <Input
            type="number"
            value={data.monthly_revenue_target ?? ""}
            onChange={(e) => onChange({ monthly_revenue_target: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ex: 50000"
          />
        </div>
        <div className="space-y-2">
          <Label>Meta Trimestral (€)</Label>
          <Input
            type="number"
            value={data.quarterly_revenue_target ?? ""}
            onChange={(e) => onChange({ quarterly_revenue_target: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ex: 150000"
          />
        </div>
        <div className="space-y-2">
          <Label>Meta Anual (€)</Label>
          <Input
            type="number"
            value={data.annual_revenue_target ?? ""}
            onChange={(e) => onChange({ annual_revenue_target: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ex: 600000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deals/Mês (objetivo)</Label>
        <Input
          type="number"
          value={data.deals_target_monthly ?? ""}
          onChange={(e) => onChange({ deals_target_monthly: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 20"
        />
      </div>
    </div>
  );
}
