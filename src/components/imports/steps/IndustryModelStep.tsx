import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, GraduationCap, Heart, Briefcase, Megaphone, Settings2, Sparkles } from "lucide-react";
import { IndustryType, INDUSTRY_PRESETS } from "@/types/import";
import { useIndustryLabels } from "@/hooks/useIndustryLabels";

interface IndustryModelStepProps {
  selectedIndustry: IndustryType;
  onIndustryChange: (industry: IndustryType) => void;
  onNext: () => void;
  onBack: () => void;
}

const INDUSTRY_OPTIONS: { id: IndustryType; label: string; description: string; icon: React.ElementType; examples: string[] }[] = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Terminologia standard CRM',
    icon: Settings2,
    examples: ['Contactos', 'Empresas', 'Leads'],
  },
  {
    id: 'formacao',
    label: 'Formação / Escola',
    description: 'Ideal para escolas e centros de formação',
    icon: GraduationCap,
    examples: ['Alunos', 'Cursos', 'Matrículas'],
  },
  {
    id: 'saude',
    label: 'Saúde / Clínica',
    description: 'Adaptado para consultórios e clínicas',
    icon: Heart,
    examples: ['Pacientes', 'Tratamentos', 'Procedimentos'],
  },
  {
    id: 'servicos',
    label: 'Serviços',
    description: 'Para empresas de prestação de serviços',
    icon: Briefcase,
    examples: ['Clientes', 'Serviços', 'Projetos'],
  },
  {
    id: 'agencia',
    label: 'Agência',
    description: 'Para agências de marketing e comunicação',
    icon: Megaphone,
    examples: ['Clientes', 'Campanhas', 'Projetos'],
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Criar terminologia própria',
    icon: Sparkles,
    examples: ['Configurável', 'após', 'importação'],
  },
];

export function IndustryModelStep({
  selectedIndustry,
  onIndustryChange,
  onNext,
  onBack,
}: IndustryModelStepProps) {
  const { data: existingLabels } = useIndustryLabels();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Escolher Modelo de Negócio
        </CardTitle>
        <CardDescription>
          Define a linguagem/terminologia usada no CRM. Isto altera apenas os títulos exibidos,
          não o modelo de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {existingLabels && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                Modelo atual: {INDUSTRY_OPTIONS.find(o => o.id === existingLabels.industry_type)?.label || 'Padrão'}
              </Badge>
              <span className="text-muted-foreground">
                Podes manter ou alterar para esta importação
              </span>
            </p>
          </div>
        )}

        <RadioGroup
          value={selectedIndustry}
          onValueChange={(value) => onIndustryChange(value as IndustryType)}
          className="grid gap-3"
        >
          {INDUSTRY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedIndustry === option.id;
            const preset = INDUSTRY_PRESETS[option.id];

            return (
              <div
                key={option.id}
                className={`relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => onIndustryChange(option.id)}
              >
                <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor={option.id} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {option.id !== 'custom' ? (
                      <>
                        <Badge variant="outline" className="text-xs font-normal">
                          {preset.contacts}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-normal">
                          {preset.products}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-normal">
                          {preset.opportunities}
                        </Badge>
                      </>
                    ) : (
                      option.examples.map((ex, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal opacity-50">
                          {ex}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button onClick={onNext}>
            Continuar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
