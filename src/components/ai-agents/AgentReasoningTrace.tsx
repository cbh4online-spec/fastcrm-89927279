import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ReasoningStep } from "@/types/aiAgents";
import { 
  CheckCircle, 
  Circle, 
  Database, 
  Calculator, 
  Brain,
  Clock 
} from "lucide-react";

interface AgentReasoningTraceProps {
  steps: ReasoningStep[];
  className?: string;
}

const toolIcons: Record<string, React.ElementType> = {
  get_entity_data: Database,
  get_conversation_history: Database,
  calculate_score: Calculator,
  get_pipeline_context: Database,
  get_activity_timeline: Clock,
  get_previous_conclusions: Brain,
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600";
  if (confidence >= 0.5) return "text-amber-600";
  return "text-red-600";
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500/10";
  if (confidence >= 0.5) return "bg-amber-500/10";
  return "bg-red-500/10";
}

export function AgentReasoningTrace({ steps, className }: AgentReasoningTraceProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, idx) => {
        const ToolIcon = toolIcons[step.toolUsed || ''] || Circle;
        const isLast = idx === steps.length - 1;
        
        return (
          <div 
            key={step.step} 
            className={cn(
              "relative pl-6 pb-3",
              !isLast && "border-l-2 border-muted ml-2"
            )}
          >
            {/* Step indicator */}
            <div className={cn(
              "absolute -left-2.5 top-0 w-5 h-5 rounded-full flex items-center justify-center",
              getConfidenceBg(step.confidence)
            )}>
              <span className={cn("text-[10px] font-medium", getConfidenceColor(step.confidence))}>
                {step.step}
              </span>
            </div>
            
            {/* Step content */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{step.action}</span>
                {step.toolUsed && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                    <ToolIcon className="h-2.5 w-2.5" />
                    {step.toolUsed}
                  </Badge>
                )}
              </div>
              
              {step.input && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Input:</span> {step.input}
                </p>
              )}
              
              {step.output && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Output:</span> {step.output}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] font-medium",
                  getConfidenceColor(step.confidence)
                )}>
                  {Math.round(step.confidence * 100)}% confiança
                </span>
                
                {step.durationMs && (
                  <span className="text-[10px] text-muted-foreground">
                    • {step.durationMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Final status */}
      <div className="flex items-center gap-2 pt-1 pl-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-xs font-medium text-green-600">
          Análise concluída
        </span>
      </div>
    </div>
  );
}
