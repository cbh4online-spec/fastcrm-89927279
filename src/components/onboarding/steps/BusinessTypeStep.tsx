import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Stethoscope,
  Briefcase,
  Megaphone,
  Home,
  Car,
  Wrench,
  ShoppingBag,
  Building2,
  Dumbbell,
  Utensils,
  Plane,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";

const businessTypes = [
  { id: "education", label: "Educação", sublabel: "Escolas, Cursos, Formação", icon: GraduationCap },
  { id: "health", label: "Saúde", sublabel: "Clínicas, Consultórios", icon: Stethoscope },
  { id: "services", label: "Serviços", sublabel: "Consultoria, Freelance", icon: Briefcase },
  { id: "marketing", label: "Marketing", sublabel: "Agências, Digital", icon: Megaphone },
  { id: "realestate", label: "Imobiliário", sublabel: "Vendas, Arrendamento", icon: Home },
  { id: "automotive", label: "Automóvel", sublabel: "Vendas, Oficinas", icon: Car },
  { id: "construction", label: "Construção", sublabel: "Obras, Remodelações", icon: Wrench },
  { id: "retail", label: "Retalho", sublabel: "Lojas, E-commerce", icon: ShoppingBag },
  { id: "b2b", label: "B2B", sublabel: "Empresas, Software", icon: Building2 },
  { id: "fitness", label: "Fitness", sublabel: "Ginásios, Personal", icon: Dumbbell },
  { id: "food", label: "Restauração", sublabel: "Restaurantes, Catering", icon: Utensils },
  { id: "travel", label: "Turismo", sublabel: "Viagens, Hotelaria", icon: Plane },
  { id: "other", label: "Outro", sublabel: "Especificar", icon: MoreHorizontal },
];

interface BusinessTypeStepProps {
  value: string;
  customValue: string;
  onChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  onNext: () => void;
}

export function BusinessTypeStep({
  value,
  customValue,
  onChange,
  onCustomChange,
  onNext,
}: BusinessTypeStepProps) {
  const isValid = value && (value !== "other" || customValue.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Que tipo de negócio tens?
        </h2>
        <p className="text-muted-foreground">
          Seleciona a opção que melhor descreve a tua atividade
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {businessTypes.map((type) => (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
              value === type.id && "border-primary ring-2 ring-primary/20 bg-primary/5"
            )}
            onClick={() => onChange(type.id)}
          >
            <CardContent className="p-4 text-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center transition-colors",
                  value === type.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <type.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-sm text-foreground">{type.label}</p>
              <p className="text-xs text-muted-foreground">{type.sublabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {value === "other" && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="customBusiness">Descreve o teu negócio</Label>
          <Input
            id="customBusiness"
            placeholder="Ex: Empresa de limpezas industriais"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="max-w-md"
          />
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!isValid} size="lg">
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
