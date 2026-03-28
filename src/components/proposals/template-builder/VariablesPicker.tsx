import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const variableGroups = [
  {
    label: "Lead / Contacto",
    vars: [
      { key: "{{lead.name}}", label: "Nome do Lead" },
      { key: "{{lead.email}}", label: "Email do Lead" },
      { key: "{{contact.name}}", label: "Nome do Contacto" },
      { key: "{{company.name}}", label: "Nome da Empresa" },
    ],
  },
  {
    label: "Oportunidade",
    vars: [
      { key: "{{opportunity.title}}", label: "Título" },
      { key: "{{opportunity.value}}", label: "Valor" },
    ],
  },
  {
    label: "Proposta",
    vars: [
      { key: "{{proposal.date}}", label: "Data de criação" },
      { key: "{{proposal.expiry}}", label: "Data de expiração" },
      { key: "{{proposal.price}}", label: "Preço" },
    ],
  },
];

interface VariablesPickerProps {
  onInsert: (variable: string) => void;
}

export function VariablesPicker({ onInsert }: VariablesPickerProps) {
  const handleClick = (v: string) => {
    onInsert(v);
    toast.success(`Variável ${v} copiada`);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Variáveis
      </Label>
      <p className="text-[11px] text-muted-foreground">
        Clique para copiar e cole no editor.
      </p>
      {variableGroups.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{group.label}</p>
          <div className="space-y-0.5">
            {group.vars.map((v) => (
              <Button
                key={v.key}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-7 text-[11px] font-mono hover:bg-primary/5"
                onClick={() => handleClick(v.key)}
              >
                {v.key}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
