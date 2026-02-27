import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BusinessContextUpdate } from "@/hooks/useBusinessContext";

const MODELS = [
  { value: "saas", label: "SaaS", icon: "☁️" },
  { value: "agency", label: "Agência", icon: "🏢" },
  { value: "infoproduct", label: "Infoproduto", icon: "📚" },
  { value: "consulting", label: "Consultoria", icon: "🧠" },
  { value: "services", label: "Serviços", icon: "⚙️" },
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
];

interface Props {
  data: BusinessContextUpdate;
  onChange: (fields: BusinessContextUpdate) => void;
}

export function StepBusinessModel({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Modelo de Negócio</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ business_model: m.value })}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                data.business_model === m.value
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border hover:border-gold/30"
              }`}
            >
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição do Negócio</Label>
        <Textarea
          value={data.business_description || ""}
          onChange={(e) => onChange({ business_description: e.target.value })}
          placeholder="Descreva brevemente o que a sua empresa faz, o problema que resolve e para quem..."
          rows={4}
        />
      </div>
    </div>
  );
}
