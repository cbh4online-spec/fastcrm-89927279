import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  GraduationCap,
  Package,
  Calculator,
  TrendingUp,
  FileText,
  Settings,
  Check,
} from "lucide-react";
import { ActivityProfileType, PROFILE_TYPE_LABELS } from "@/types/activityProfile";

interface ProfileOption {
  type: ActivityProfileType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  examples: string[];
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    type: "generico",
    label: "Genérico",
    description: "Vendas e gestão de clientes padrão",
    icon: Briefcase,
    color: "#6366f1",
    examples: ["Consultoria", "Agências", "Freelancers"],
  },
  {
    type: "formacao_educacao",
    label: "Formação / Educação",
    description: "Escolas, cursos, alunos e sessões",
    icon: GraduationCap,
    color: "#10b981",
    examples: ["Academias", "Formadores", "Explicações"],
  },
  {
    type: "produtos",
    label: "Produtos",
    description: "Comércio de produtos físicos ou digitais",
    icon: Package,
    color: "#f59e0b",
    examples: ["E-commerce", "Lojas", "Distribuidores"],
  },
  {
    type: "servicos_financeiros",
    label: "Serviços Financeiros",
    description: "Contabilidade, fiscalidade e compliance",
    icon: Calculator,
    color: "#3b82f6",
    examples: ["Contabilistas", "Gabinetes Fiscais"],
  },
  {
    type: "marketing_digital",
    label: "Marketing Digital",
    description: "Campanhas, performance e reporting",
    icon: TrendingUp,
    color: "#ec4899",
    examples: ["Agências de Marketing", "Social Media"],
  },
  {
    type: "avencas_contratos",
    label: "Avenças / Contratos",
    description: "Serviços recorrentes e subscrições",
    icon: FileText,
    color: "#8b5cf6",
    examples: ["SaaS", "Manutenção", "Consultoria retainer"],
  },
  {
    type: "servicos_profissionais",
    label: "Serviços Profissionais",
    description: "Projetos, horas e entregas",
    icon: Settings,
    color: "#64748b",
    examples: ["Advogados", "Arquitetos", "Consultores"],
  },
];

interface ActivityProfileSelectorProps {
  value: ActivityProfileType | undefined;
  onChange: (value: ActivityProfileType) => void;
  className?: string;
}

export function ActivityProfileSelector({
  value,
  onChange,
  className,
}: ActivityProfileSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 md:grid-cols-2">
        {PROFILE_OPTIONS.map((option) => {
          const isSelected = value === option.type;
          const Icon = option.icon;

          return (
            <Card
              key={option.type}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:border-primary/50"
              )}
              onClick={() => onChange(option.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{option.label}</h3>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {option.examples.map((example) => (
                        <Badge
                          key={example}
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
