import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Estágios</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onMoveToNext}
          disabled={isLoading || currentIndex >= stages.length - 1}
        >
          Avançar Estágio
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage indicator */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    isCompleted && "bg-primary/10 text-primary",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted && <Check className="w-4 h-4 mr-1.5" />}
                  {isCurrent && <Circle className="w-3 h-3 mr-1.5 fill-current" />}
                  <span className="truncate">{stage.name}</span>
                </div>
              </div>

              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-4 mx-1",
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
