/**
 * Assistente guiado do "Contacto 1:1 validado".
 * Mostra o progresso e explica cada bloqueio sem esconder regras.
 */
import { CheckCircle2, Circle, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { OutreachWizardStep } from "../lib/outreachWizard";

export function OutreachWizard({
  steps,
  progress,
  onNavigate,
  className,
}: {
  steps: OutreachWizardStep[];
  progress: number;
  onNavigate: (target: OutreachWizardStep["ctaTarget"]) => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-muted/20 p-4 space-y-3", className)} aria-label="Assistente de contacto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Como preparar este contacto</h3>
        <span className="text-xs text-muted-foreground">{progress}% concluído</span>
      </div>
      <Progress value={progress} aria-label={`Progresso: ${progress}%`} />

      <ol className="space-y-2">
        {steps.map((step, i) => {
          const isBlocked = step.status === "blocked";
          const isDone = step.status === "done";
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-start sm:justify-between",
                step.status === "current" && "border-primary/50",
                isBlocked && "border-destructive/40",
              )}
            >
              <div className="flex items-start gap-2">
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                ) : isBlocked ? (
                  <Lock className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                )}
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {step.blockedReason && (
                    <p className="text-xs text-destructive">{step.blockedReason}</p>
                  )}
                </div>
              </div>
              {step.status !== "done" && (
                <Button size="sm" variant="ghost" className="self-start" onClick={() => onNavigate(step.ctaTarget)}>
                  {step.ctaLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default OutreachWizard;
