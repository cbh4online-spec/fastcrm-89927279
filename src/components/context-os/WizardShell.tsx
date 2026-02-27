import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessContextUpdate, useBusinessContext } from "@/hooks/useBusinessContext";
import { toast } from "sonner";

import { StepBusinessModel } from "./steps/StepBusinessModel";
import { StepICP } from "./steps/StepICP";
import { StepOffers } from "./steps/StepOffers";
import { StepSalesProcess } from "./steps/StepSalesProcess";
import { StepObjections } from "./steps/StepObjections";
import { StepGoals } from "./steps/StepGoals";
import { StepTeam } from "./steps/StepTeam";

const STEPS = [
  { key: "business", title: "Modelo de Negócio", icon: "💼" },
  { key: "icp", title: "ICP", icon: "🎯" },
  { key: "offers", title: "Ofertas & Pricing", icon: "💰" },
  { key: "process", title: "Processo Comercial", icon: "⚙️" },
  { key: "objections", title: "Objeções & Scripts", icon: "🛡️" },
  { key: "goals", title: "Metas de Receita", icon: "📊" },
  { key: "team", title: "Equipa", icon: "👥" },
];

interface WizardShellProps {
  initialData: BusinessContextUpdate | null;
}

export function WizardShell({ initialData }: WizardShellProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<BusinessContextUpdate>(initialData || {});
  const { upsert } = useBusinessContext();

  const progress = ((step + 1) / STEPS.length) * 100;

  const updateFields = (fields: BusinessContextUpdate) => {
    const next = { ...formData, ...fields };
    setFormData(next);
    // Auto-save on each field change
    upsert.mutate(next);
  };

  const handleFinish = () => {
    upsert.mutate({ ...formData, onboarding_completed: true }, {
      onSuccess: () => toast.success("Context OS configurado com sucesso!"),
    });
  };

  const stepComponents = [
    <StepBusinessModel key="bm" data={formData} onChange={updateFields} />,
    <StepICP key="icp" data={formData} onChange={updateFields} />,
    <StepOffers key="off" data={formData} onChange={updateFields} />,
    <StepSalesProcess key="sp" data={formData} onChange={updateFields} />,
    <StepObjections key="obj" data={formData} onChange={updateFields} />,
    <StepGoals key="goals" data={formData} onChange={updateFields} />,
    <StepTeam key="team" data={formData} onChange={updateFields} />,
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
          <Brain className="h-4 w-4 text-gold" />
          <span className="text-sm font-medium text-gold">Context OS</span>
        </div>
        <h1 className="text-2xl font-bold">Configure o seu Revenue OS</h1>
        <p className="text-muted-foreground text-sm">O sistema precisa de conhecer o seu negócio para operar com inteligência.</p>
      </div>

      {/* Step indicators */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{STEPS[step].icon} {STEPS[step].title}</span>
          <span>{step + 1} / {STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-1.5 [&>div]:bg-gold" />
      </div>

      {/* Step pills */}
      <div className="flex gap-1.5 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              i === step
                ? "bg-gold/15 border-gold/40 text-gold"
                : i < step
                ? "bg-muted/50 border-border text-muted-foreground"
                : "border-border/50 text-muted-foreground/50"
            )}
          >
            {i < step ? "✓" : s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 min-h-[300px]">
        {stepComponents[step]}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
            disabled={upsert.isPending}
          >
            <Check className="h-4 w-4" /> Concluir Setup
          </Button>
        )}
      </div>
    </div>
  );
}
