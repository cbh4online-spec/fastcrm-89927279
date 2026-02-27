import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { TagInput } from "../TagInput";

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepICP({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Descrição do Cliente Ideal (ICP)</Label>
        <Textarea
          value={data.icp_description || ""}
          onChange={(e) => onChange({ icp_description: e.target.value })}
          placeholder="Quem é o seu cliente ideal? Qual o perfil, cargo, dor principal..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Indústrias</Label>
        <TagInput
          values={data.icp_industries || []}
          onChange={(v) => onChange({ icp_industries: v })}
          placeholder="Ex: Tecnologia, Saúde, Educação..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tamanho da Empresa</Label>
          <Input
            value={data.icp_company_size || ""}
            onChange={(e) => onChange({ icp_company_size: e.target.value })}
            placeholder="Ex: 10-50 colaboradores"
          />
        </div>
        <div className="space-y-2">
          <Label>Decision Maker</Label>
          <Input
            value={data.icp_decision_maker || ""}
            onChange={(e) => onChange({ icp_decision_maker: e.target.value })}
            placeholder="Ex: CEO, CMO, Head of Sales"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pain Points Principais</Label>
        <TagInput
          values={data.icp_pain_points || []}
          onChange={(v) => onChange({ icp_pain_points: v })}
          placeholder="Ex: Falta de leads qualificados..."
        />
      </div>
    </div>
  );
}
