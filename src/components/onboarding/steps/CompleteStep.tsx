import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  Workflow,
  Database,
  FormInput,
  Zap,
  Rocket,
} from "lucide-react";

interface CompleteStepProps {
  onContinue: () => void;
}

export function CompleteStep({ onContinue }: CompleteStepProps) {
  const features = [
    {
      icon: Workflow,
      title: "Pipeline Configurado",
      description: "Etapas personalizadas para o teu negócio",
    },
    {
      icon: Database,
      title: "Campos Criados",
      description: "Informações relevantes para o teu setor",
    },
    {
      icon: FormInput,
      title: "Formulários Prontos",
      description: "Captura leads desde já",
    },
    {
      icon: Zap,
      title: "Automações Sugeridas",
      description: "Revê e ativa quando quiseres",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-bounce">
          <Rocket className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          O teu CRM está pronto! 🎉
        </h2>
        <p className="text-muted-foreground text-lg max-w-md">
          Configurámos tudo com base no teu negócio. 
          Podes começar a usar imediatamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {features.map((feature, index) => (
          <Card key={index} className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4">
        <Button onClick={onContinue} size="lg" className="gap-2">
          Ir para o Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Podes ajustar qualquer configuração nas Definições a qualquer momento.
      </p>
    </div>
  );
}
