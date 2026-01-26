import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useAgentAnalysis } from "@/hooks/useAgentAnalysis";
import { AgentInsightCard } from "@/components/ai-agents/AgentInsightCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface OpportunityAIInsightsSectionProps {
  opportunityId: string;
  onActionClick?: (actionType: string) => void;
}

export function OpportunityAIInsightsSection({ 
  opportunityId,
  onActionClick 
}: OpportunityAIInsightsSectionProps) {
  const { currentWorkspace } = useWorkspace();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const { 
    analyze, 
    isAnalyzing, 
    lastAnalysis,
    isLoadingLast,
    canAnalyze 
  } = useAgentAnalysis('opportunity', opportunityId, 'opportunity');

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      toast.error('Não foi possível iniciar a análise');
      return;
    }
    
    try {
      await analyze('manual');
      setHasAnalyzed(true);
    } catch (error) {
      console.error('Error analyzing opportunity:', error);
    }
  };

  const handleActionClick = (actionType: string) => {
    // Map action types to specific behaviors
    switch (actionType) {
      case 'send_proposal':
        toast.info('Funcionalidade de proposta em desenvolvimento');
        break;
      case 'schedule_meeting':
        toast.info('Funcionalidade de agendamento em desenvolvimento');
        break;
      case 'follow_up_urgently':
        toast.info('A criar tarefa de follow-up...');
        break;
      default:
        onActionClick?.(actionType);
    }
  };

  // Show loading state
  if (isLoadingLast) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If we have a previous analysis, show it
  if (lastAnalysis?.output) {
    return (
      <AgentInsightCard
        output={lastAnalysis.output}
        executionId={lastAnalysis.executionId}
        reasoningTrace={lastAnalysis.reasoningTrace}
        isLoading={isAnalyzing}
        onRefresh={handleAnalyze}
        onActionClick={handleActionClick}
        showFeedback={true}
      />
    );
  }

  // No analysis yet - show prompt to analyze
  return (
    <div className="text-center py-12 space-y-4">
      <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="font-medium text-lg">Análise IA da Oportunidade</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Obtenha insights sobre probabilidade de fecho, riscos e próximos passos recomendados.
        </p>
      </div>
      <Button 
        onClick={handleAnalyze} 
        disabled={isAnalyzing || !canAnalyze}
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
            Analisar Oportunidade
          </>
        )}
      </Button>
    </div>
  );
}
