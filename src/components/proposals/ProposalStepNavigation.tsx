import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart,
  Target,
  CalendarDays,
  FileCheck,
  Award,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  LucideIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ProposalStep {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export const PROPOSAL_STEPS: ProposalStep[] = [
  {
    id: "items",
    label: "Itens",
    icon: ShoppingCart,
    description: "Produtos e serviços",
  },
  {
    id: "scope",
    label: "Âmbito",
    icon: Target,
    description: "Objectivos e entregáveis",
  },
  {
    id: "timeline",
    label: "Cronograma",
    icon: CalendarDays,
    description: "Fases e marcos",
  },
  {
    id: "conditions",
    label: "Condições",
    icon: FileCheck,
    description: "Pagamento e termos",
  },
  {
    id: "references",
    label: "Referências",
    icon: Award,
    description: "Casos de sucesso",
  },
  {
    id: "client",
    label: "Cliente",
    icon: Users,
    description: "Dados de facturação",
  },
];

interface ProposalStepNavigationProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps?: Set<number>;
}

export function ProposalStepNavigation({
  currentStep,
  onStepChange,
  completedSteps = new Set(),
}: ProposalStepNavigationProps) {
  const isMobile = useIsMobile();
  const progress = ((currentStep + 1) / PROPOSAL_STEPS.length) * 100;

  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < PROPOSAL_STEPS.length - 1;

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile progress */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium">
            Passo {currentStep + 1} de {PROPOSAL_STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {PROPOSAL_STEPS[currentStep].label}
          </span>
        </div>
        
        <Progress value={progress} className="h-2" />

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {PROPOSAL_STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  isCurrent && "w-6 bg-primary",
                  !isCurrent && isCompleted && "bg-primary/60",
                  !isCurrent && !isCompleted && "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={!canGoBack}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            onClick={() => onStepChange(currentStep + 1)}
            disabled={!canGoForward}
            className="flex-1"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop stepper
  return (
    <div className="space-y-4">
      {/* Steps row */}
      <div className="flex items-center justify-between">
        {PROPOSAL_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isPast = index < currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step button */}
              <button
                onClick={() => onStepChange(index)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-all",
                  "hover:bg-accent",
                  isCurrent && "bg-primary/10"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isPast && isCompleted && "border-primary bg-primary text-primary-foreground",
                    isPast && !isCompleted && "border-muted-foreground/40 bg-muted text-muted-foreground",
                    !isCurrent && !isPast && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isPast && isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-primary",
                      !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {index < PROPOSAL_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    isPast ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar for desktop */}
      <Progress value={progress} className="h-1" />

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <div className="text-sm text-muted-foreground">
          {currentStep + 1} / {PROPOSAL_STEPS.length}
        </div>
        <Button
          onClick={() => onStepChange(currentStep + 1)}
          disabled={!canGoForward}
        >
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
