import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Brain, ShieldCheck, Pencil, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessContextUpdate, useBusinessContext } from "@/hooks/useBusinessContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  const [completed, setCompleted] = useState(initialData?.onboarding_completed === true);
  const [formData, setFormData] = useState<BusinessContextUpdate>(initialData || {});
  const { upsert } = useBusinessContext();
  const navigate = useNavigate();

  const progress = ((step + 1) / STEPS.length) * 100;

  const updateFields = (fields: BusinessContextUpdate) => {
    const next = { ...formData, ...fields };
    setFormData(next);
    // Auto-save on each field change
    upsert.mutate(next);
  };

  const handleFinish = () => {
    upsert.mutate({ ...formData, onboarding_completed: true }, {
      onSuccess: () => {
        toast.success("Context OS configurado com sucesso!");
        setCompleted(true);
      },
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

  if (completed) {
    const businessModelLabels: Record<string, string> = {
      saas: "SaaS", agency: "Agência", infoproduct: "Infoproduto",
      consulting: "Consultoria", services: "Serviços", ecommerce: "E-commerce",
    };
    const offers = (formData.offers as any[]) || [];

    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gold/15 border-2 border-gold/30 mx-auto">
            <ShieldCheck className="h-10 w-10 text-gold" />
          </div>
          <h1 className="text-2xl font-bold">Context OS Configurado</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            O sistema já conhece o seu negócio e está pronto para operar com inteligência.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {formData.business_model && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">💼 Modelo</p>
              <p className="font-medium">{businessModelLabels[formData.business_model] || formData.business_model}</p>
            </div>
          )}
          {formData.icp_description && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">🎯 ICP</p>
              <p className="font-medium text-sm line-clamp-2">{formData.icp_description}</p>
            </div>
          )}
          {offers.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">💰 Ofertas</p>
              <p className="font-medium">{offers.length} oferta{offers.length !== 1 ? "s" : ""} configurada{offers.length !== 1 ? "s" : ""}</p>
            </div>
          )}
          {formData.monthly_revenue_target && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">📊 Meta Mensal</p>
              <p className="font-medium">€{Number(formData.monthly_revenue_target).toLocaleString("pt-PT")}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <Button variant="outline" className="gap-1.5" onClick={() => setCompleted(false)}>
            <Pencil className="h-4 w-4" /> Editar Configuração
          </Button>
          <Button className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
