import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Sparkles, 
  ChevronDown, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Target,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentOutput, ConfidenceLevel, ReasoningStep } from "@/types/aiAgents";
import { getConfidenceColor, getConfidenceLabel } from "@/types/aiAgents";
import { AgentReasoningTrace } from "./AgentReasoningTrace";
import { AgentFeedbackButtons } from "./AgentFeedbackButtons";

interface AgentInsightCardProps {
  output: AgentOutput;
  executionId: string;
  reasoningTrace?: ReasoningStep[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onActionClick?: (actionType: string) => void;
  showFeedback?: boolean;
  className?: string;
}

const confidenceIcons: Record<ConfidenceLevel, React.ElementType> = {
  high: CheckCircle,
  medium: Target,
  low: AlertTriangle,
};

const confidenceBgColors: Record<ConfidenceLevel, string> = {
  high: "bg-green-500/10 border-green-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  low: "bg-red-500/10 border-red-500/20",
};

export function AgentInsightCard({
  output,
  executionId,
  reasoningTrace,
  isLoading,
  onRefresh,
  onActionClick,
  showFeedback = true,
  className,
}: AgentInsightCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  
  const ConfidenceIcon = confidenceIcons[output.confidenceLevel] || Target;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Confidence indicator stripe */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-1 h-full",
          output.confidenceLevel === 'high' && "bg-green-500",
          output.confidenceLevel === 'medium' && "bg-amber-500",
          output.confidenceLevel === 'low' && "bg-red-500",
        )}
      />
      
      <CardHeader className="pb-3 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">Análise IA</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ConfidenceIcon className={cn("h-3 w-3", getConfidenceColor(output.confidenceLevel))} />
                <span className={cn("text-xs", getConfidenceColor(output.confidenceLevel))}>
                  {getConfidenceLabel(output.confidenceLevel)}
                </span>
              </div>
            </div>
          </div>
          
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pl-5 space-y-4">
        {/* Executive Summary */}
        <div>
          <p className="text-sm text-foreground leading-relaxed">
            {output.executiveSummary}
          </p>
        </div>
        
        {/* Status Assessment */}
        {output.statusAssessment && (
          <div className="p-2.5 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">
              {output.statusAssessment}
            </p>
          </div>
        )}
        
        {/* Key Signals */}
        {output.keySignals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Sinais Observados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {output.keySignals.map((signal, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-normal">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Risk Indicators */}
        {output.riskIndicators.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-destructive/80 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Indicadores de Risco
            </p>
            <div className="flex flex-wrap gap-1.5">
              {output.riskIndicators.map((risk, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs font-normal border-destructive/30 text-destructive"
                >
                  {risk}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Recommended Action */}
        {output.recommendedAction && (
          <div className={cn(
            "p-3 rounded-lg border",
            confidenceBgColors[output.confidenceLevel]
          )}>
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Ação Recomendada
            </p>
            <p className="text-sm mb-3">{output.recommendedAction}</p>
            
            {onActionClick && (
              <Button 
                size="sm" 
                className="w-full" 
                onClick={() => onActionClick(output.recommendedActionType as string)}
              >
                Executar Ação
              </Button>
            )}
          </div>
        )}
        
        {/* Feedback Buttons */}
        {showFeedback && (
          <AgentFeedbackButtons executionId={executionId} />
        )}
        
        {/* Reasoning Trace (Collapsible) */}
        {reasoningTrace && reasoningTrace.length > 0 && (
          <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-xs h-8"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Ver raciocínio ({reasoningTrace.length} passos)
                </span>
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  showReasoning && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <AgentReasoningTrace steps={reasoningTrace} />
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          A IA apenas sugere • Todas as ações requerem confirmação
        </p>
      </CardContent>
    </Card>
  );
}
