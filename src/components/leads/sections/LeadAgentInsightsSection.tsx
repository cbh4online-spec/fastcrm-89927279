import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useAgentAnalysis } from "@/hooks/useAgentAnalysis";
import { AgentInsightCard } from "@/components/ai-agents/AgentInsightCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useAgentAnalytics, generateRecommendationId } from "@/hooks/useAgentAnalytics";

interface LeadAgentInsightsSectionProps {
  leadId: string;
  onActionClick?: (actionType: string) => void;
}

export function LeadAgentInsightsSection({ 
  leadId,
  onActionClick 
}: LeadAgentInsightsSectionProps) {
  const { currentWorkspace } = useWorkspace();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [recommendationId] = useState(() => generateRecommendationId());
  const { trackRecommendationGenerated, trackActionExecuted, trackAgentRunFailed } = useAgentAnalytics();
  
  const { 
    analyze, 
    isAnalyzing, 
    lastAnalysis,
    isLoadingLast,
    canAnalyze,
    getCurrentBehavioralMode,
  } = useAgentAnalysis('lead', leadId, 'lead');

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      toast.error('Não foi possível iniciar a análise');
      return;
    }
    
    const startTime = Date.now();
    
    try {
      await analyze('manual');
      setHasAnalyzed(true);
      
      // Track recommendation generated
      trackRecommendationGenerated({
        entityType: 'lead',
        entityId: leadId,
        agentType: 'lead',
        recommendationId,
        recommendationType: 'task', // Default, will be refined by agent output
        confidence: 'medium',
        latencyMs: Date.now() - startTime,
      });
    } catch (error) {
      console.error('Error analyzing lead:', error);
      
      // Track failure
      trackAgentRunFailed({
        entityType: 'lead',
        entityId: leadId,
        agentType: 'lead',
        errorType: 'analysis_failed',
        errorReason: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      });
    }
  };

  const handleActionClick = (actionType: string) => {
    // Track action execution
    trackActionExecuted({
      entityType: 'lead',
      entityId: leadId,
      agentType: 'lead',
      recommendationId,
      actionType,
      executionChannel: 'crm',
    });
    
    switch (actionType) {
      case 'create_opportunity':
        toast.info('Funcionalidade de criar oportunidade em desenvolvimento');
        break;
      case 'send_template':
        toast.info('Funcionalidade de template em desenvolvimento');
        break;
      case 'schedule_followup':
        toast.info('A criar tarefa de follow-up...');
        break;
      case 'nurture':
        toast.info('A adicionar à sequência de nurturing...');
        break;
      default:
        onActionClick?.(actionType);
    }
  };

  // Show loading state
  if (isLoadingLast) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If we have a previous analysis, show it
  if (lastAnalysis?.output) {
    const modeResult = getCurrentBehavioralMode();
    
    return (
      <AgentInsightCard
        output={lastAnalysis.output}
        executionId={lastAnalysis.executionId}
        reasoningTrace={lastAnalysis.reasoningTrace}
        isLoading={isAnalyzing}
        onRefresh={handleAnalyze}
        onActionClick={handleActionClick}
        showFeedback={true}
        // Analytics context
        entityType="lead"
        entityId={leadId}
        agentType="lead"
        surface="entity_page"
        recommendationId={recommendationId}
        // Behavioral mode
        behavioralMode={modeResult?.selectedMode}
      />
    );
  }

  // No analysis yet - show prompt to analyze
  return (
    <div className="text-center py-8 space-y-3">
      <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-medium">Análise IA do Lead</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Obtenha qualificação, temperatura e próximos passos recomendados.
        </p>
      </div>
      <Button 
        onClick={handleAnalyze} 
        disabled={isAnalyzing || !canAnalyze}
        size="sm"
        className="gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            A analisar...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analisar Lead
          </>
        )}
      </Button>
    </div>
  );
}
