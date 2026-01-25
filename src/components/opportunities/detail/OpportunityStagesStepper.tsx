import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
    <Card className="p-3 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm md:text-base font-semibold">Estágios</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onMoveToNext}
          disabled={isLoading || currentIndex >= stages.length - 1}
          className="w-full sm:w-auto"
        >
          Avançar Estágio
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 md:gap-2 pb-2 min-w-max">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={stage.id} className="flex items-center">
                {/* Stage indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                    isCompleted && "bg-primary/10 text-primary",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted && <Check className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5" />}
                  {isCurrent && <Circle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 md:mr-1.5 fill-current" />}
                  <span className="truncate max-w-[80px] md:max-w-none">{stage.name}</span>
                </div>

                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-2 md:w-4 mx-0.5 md:mx-1 flex-shrink-0",
                      index < currentIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
