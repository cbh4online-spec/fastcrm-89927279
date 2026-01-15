import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Calendar,
  FileText,
  CreditCard,
  Handshake,
  CheckCircle,
  Package,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

const successOptions = [
  { id: "enrollment", label: "Matrícula", sublabel: "Inscrição confirmada", icon: GraduationCap },
  { id: "appointment", label: "Consulta", sublabel: "Marcação realizada", icon: Calendar },
  { id: "contract", label: "Contrato", sublabel: "Assinatura de contrato", icon: FileText },
  { id: "payment", label: "Pagamento", sublabel: "Pagamento recebido", icon: CreditCard },
  { id: "deal", label: "Negócio", sublabel: "Acordo fechado", icon: Handshake },
  { id: "delivery", label: "Entrega", sublabel: "Produto/serviço entregue", icon: Package },
  { id: "custom", label: "Outro", sublabel: "Definir manualmente", icon: CheckCircle },
];

const businessSuccessHints: Record<string, string[]> = {
  education: ["Matrícula confirmada", "Inscrição no curso", "Primeiro pagamento"],
  health: ["Consulta realizada", "Tratamento iniciado", "Plano de saúde ativo"],
  services: ["Contrato assinado", "Projeto iniciado", "Primeira fatura paga"],
  marketing: ["Campanha aprovada", "Contrato fechado", "Retainer ativo"],
  realestate: ["Escritura assinada", "Contrato de arrendamento", "Visita concretizada"],
  automotive: ["Venda concluída", "Serviço realizado", "Entrega do veículo"],
  construction: ["Orçamento aprovado", "Obra iniciada", "Projeto entregue"],
  retail: ["Compra realizada", "Pedido entregue", "Cliente fidelizado"],
  b2b: ["Contrato assinado", "Implementação iniciada", "Subscrição ativa"],
  fitness: ["Inscrição ativa", "Personal contratado", "Plano iniciado"],
  food: ["Reserva confirmada", "Evento realizado", "Contrato de catering"],
  travel: ["Reserva confirmada", "Viagem realizada", "Pacote vendido"],
  other: ["Venda concluída", "Serviço prestado", "Objetivo atingido"],
};

interface SuccessDefinitionStepProps {
  value: string;
  businessType: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SuccessDefinitionStep({
  value,
  businessType,
  onChange,
  onNext,
  onBack,
}: SuccessDefinitionStepProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");

  const hints = businessSuccessHints[businessType] || businessSuccessHints.other;

  const handleOptionSelect = (optionId: string, label: string) => {
    setSelectedOption(optionId);
    if (optionId !== "custom") {
      onChange(label);
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    onChange(val);
  };

  const isValid = value.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          O que representa uma venda bem-sucedida?
        </h2>
        <p className="text-muted-foreground">
          Quando consideras que um lead se tornou cliente?
        </p>
      </div>

      {/* Hints */}
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-muted-foreground">Sugestões:</span>
        {hints.map((hint) => (
          <button
            key={hint}
            onClick={() => onChange(hint)}
            className={cn(
              "px-3 py-1 rounded-full text-sm border transition-colors",
              value === hint
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted hover:bg-muted/80 border-transparent"
            )}
          >
            {hint}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {successOptions.map((option) => (
          <Card
            key={option.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
              selectedOption === option.id && "border-primary ring-2 ring-primary/20 bg-primary/5"
            )}
            onClick={() => handleOptionSelect(option.id, option.label)}
          >
            <CardContent className="p-4 text-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center transition-colors",
                  selectedOption === option.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <option.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-sm text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.sublabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedOption === "custom" && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="customSuccess">Define o teu critério de sucesso</Label>
          <Input
            id="customSuccess"
            placeholder="Ex: Cliente assinou o contrato anual"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="max-w-md"
          />
        </div>
      )}

      {/* Current value display */}
      {value && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">Sucesso definido como:</p>
          <p className="font-medium text-foreground">{value}</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid} size="lg">
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
