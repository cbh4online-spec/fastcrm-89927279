import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Target,
  CalendarDays,
  CreditCard,
  Award,
  Brain,
  ChevronRight,
  Send,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProposalAI, type AnalysisResult } from "@/hooks/useProposalAI";
import { ConfidenceScore } from "@/components/ai/AIConfidenceDisplay";

interface ProposalAIAssistantPanelProps {
  proposalData: {
    id: string;
    title: string;
    price: number;
    status: string;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      description?: string;
      category?: string;
    }>;
  };
  opportunityData?: {
    title: string;
    value: number;
    stage: string;
    lead?: { name: string; company?: string };
  };
  clientData?: {
    name: string;
    type: "contact" | "company";
    industry?: string;
  };
  onGenerateScope?: () => void;
  onGenerateTimeline?: () => void;
  onSuggestConditions?: () => void;
  onSuggestReferences?: () => void;
  isGeneratingScope?: boolean;
  isGeneratingTimeline?: boolean;
  isSuggestingConditions?: boolean;
  isSuggestingReferences?: boolean;
  className?: string;
}

export function ProposalAIAssistantPanel({
  proposalData,
  opportunityData,
  clientData,
  onGenerateScope,
  onGenerateTimeline,
  onSuggestConditions,
  onSuggestReferences,
  isGeneratingScope,
  isGeneratingTimeline,
  isSuggestingConditions,
  isSuggestingReferences,
  className,
}: ProposalAIAssistantPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [showCopilot, setShowCopilot] = useState(false);
  
  const { 
    analyzeProposal, 
    askCopilot,
    isAnalyzing, 
    isCopilotLoading 
  } = useProposalAI();

  // Auto-analyze when panel opens or data changes significantly
  useEffect(() => {
    if (proposalData.items.length > 0 && !analysis && !isAnalyzing) {
      handleAnalyze();
    }
  }, [proposalData.id]);

  const handleAnalyze = async () => {
    const result = await analyzeProposal(proposalData, opportunityData, clientData);
    if (result) {
      setAnalysis(result);
    }
  };

  const handleCopilotSubmit = async () => {
    if (!copilotQuestion.trim()) return;
    
    const response = await askCopilot(
      copilotQuestion,
      proposalData,
      opportunityData,
      clientData
    );
    
    if (response) {
      setCopilotResponse(response);
      setCopilotQuestion("");
    }
  };

  const quickActions = [
    {
      label: "Gerar Âmbito",
      icon: Target,
      onClick: onGenerateScope,
      isLoading: isGeneratingScope,
      disabled: !onGenerateScope,
    },
    {
      label: "Gerar Cronograma",
      icon: CalendarDays,
      onClick: onGenerateTimeline,
      isLoading: isGeneratingTimeline,
      disabled: !onGenerateTimeline,
    },
    {
      label: "Sugerir Condições",
      icon: CreditCard,
      onClick: onSuggestConditions,
      isLoading: isSuggestingConditions,
      disabled: !onSuggestConditions,
    },
    {
      label: "Sugerir Referências",
      icon: Award,
      onClick: onSuggestReferences,
      isLoading: isSuggestingReferences,
      disabled: !onSuggestReferences,
    },
  ];

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50 gap-2 shadow-lg",
          "bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30",
          className
        )}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Assistente IA
      </Button>
    );
  }

  return (
    <Card className={cn("border-primary/20 shadow-lg", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Assistente IA
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Analysis Score */}
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">A analisar...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-3">
            {/* Success Score */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Score de Sucesso
                </span>
                <span className="text-lg font-bold">{analysis.successScore}%</span>
              </div>
              <Progress value={analysis.successScore} className="h-2" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Prob. Fecho: {analysis.closeProbability}%</span>
                <ConfidenceScore confidence={analysis.confidence} size="sm" showLabel={false} />
              </div>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-1 text-green-600 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">Pontos Fortes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis.positiveFactors.length} identificados
                </p>
              </div>
              <div className="p-2 rounded-lg border bg-amber-500/5 border-amber-500/20">
                <div className="flex items-center gap-1 text-amber-600 mb-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs font-medium">Riscos</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis.riskFactors.length} identificados
                </p>
              </div>
            </div>

            {/* Top Recommendation */}
            {analysis.recommendations.length > 0 && (
              <div className="p-2 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Próxima Acção</p>
                    <p className="text-xs text-muted-foreground">
                      {analysis.recommendations[0].action}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleAnalyze}
            >
              <Brain className="h-3 w-3 mr-1" />
              Reanalisar
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Adicione itens para ver a análise
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={proposalData.items.length === 0}
            >
              <Brain className="h-4 w-4 mr-1" />
              Analisar Proposta
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Acções Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || action.isLoading}
                className="h-auto py-2 px-2 flex-col gap-1 text-xs"
              >
                {action.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <action.icon className="h-4 w-4" />
                )}
                <span className="text-[10px]">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Copilot */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => setShowCopilot(!showCopilot)}
          >
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Pergunte à IA
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                showCopilot && "rotate-90"
              )}
            />
          </Button>

          {showCopilot && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  placeholder="Como posso melhorar..."
                  className="text-xs h-8"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleCopilotSubmit();
                  }}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopilotSubmit}
                  disabled={isCopilotLoading || !copilotQuestion.trim()}
                >
                  {isCopilotLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {copilotResponse && (
                <div className="p-2 rounded-lg bg-muted/50 border text-xs">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {copilotResponse}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
