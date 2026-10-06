import { ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IXCard } from "@/components/entity/ix/IXCard";
import { cn } from "@/lib/utils";
import { PipelineStage } from "@/types/opportunity";

interface OpportunityStagesStepperProps {
  stages: PipelineStage[];
  currentStageId: string;
  onMoveToNext: () => void;
  isLoading?: boolean;
}

export function OpportunityStagesStepper({
  stages,
  currentStageId,
  onMoveToNext,
  isLoading = false,
}: OpportunityStagesStepperProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId);
  const nextStage = currentIndex >= 0 ? stages[currentIndex + 1] : undefined;

  return (
    <IXCard title="Etapas" contentClassName="px-4 pb-4 sm:px-6 sm:pb-6">
      {currentIndex < 0 && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {stages.length === 0 ? "Sem etapas disponíveis." : "A etapa atual não está disponível neste percurso."}
        </p>
      )}
      <ol aria-label="Percurso da oportunidade" className="min-w-0">
          {stages.map((stage, index) => {
            const isPrevious = currentIndex >= 0 && index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li key={stage.id} aria-current={isCurrent ? "step" : undefined} className="relative flex min-w-0 gap-3">
                <div className="flex w-7 shrink-0 flex-col items-center" aria-hidden="true">
                  <div
                    className={cn(
                      "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      isPrevious && "border-primary/30 bg-primary/10 text-primary",
                      isCurrent && "border-primary bg-card text-primary ring-4 ring-primary/10",
                      !isPrevious && !isCurrent && "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {isPrevious ? <Check className="h-3.5 w-3.5" /> : isCurrent ? <Circle className="h-2.5 w-2.5 fill-current" /> : <span className="text-xs font-medium">{index + 1}</span>}
                  </div>
                  {index < stages.length - 1 && <div className={cn("min-h-4 w-px flex-1", isPrevious ? "bg-primary/30" : "bg-border")} />}
                </div>
                <div className={cn("min-w-0 flex-1 pb-5", index === stages.length - 1 && "pb-0")}>
                  <div className={cn("min-w-0", isCurrent && "border-l-2 border-primary pl-3")}>
                    <p className={cn("break-words text-sm leading-6 [overflow-wrap:anywhere]", isCurrent ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                      {stage.name}
                    </p>
                    <p className={cn("text-xs", isCurrent ? "font-medium text-primary" : "text-muted-foreground")}>
                      {isCurrent ? "Etapa atual" : isPrevious ? "Etapa anterior" : currentIndex >= 0 ? "Por alcançar" : "Etapa do percurso"}
                    </p>
                    {isCurrent && (
                      <div className="mt-3 space-y-2">
                        {nextStage ? <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">Seguinte: <span className="font-medium text-foreground">{nextStage.name}</span></p> : <p className="text-xs text-muted-foreground">Última etapa do percurso</p>}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onMoveToNext}
                          disabled={isLoading || !nextStage}
                          className="h-10 w-full gap-2 sm:w-auto"
                          aria-label={nextStage ? `Avançar para ${nextStage.name}` : "Última etapa do percurso"}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          {isLoading ? "A avançar…" : "Avançar etapa"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
      </ol>
    </IXCard>
  );
}
