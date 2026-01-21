import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreditAI } from "../hooks/useCreditAI";
import { useBankPartners } from "../hooks/useBankPartners";
import { CreditProposal, AIViabilityAnalysis } from "../types";
import { 
  Brain, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Lightbulb,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";

interface ProposalAIAnalysisProps {
  proposal: CreditProposal;
  open: boolean;
  onClose: () => void;
}

export function ProposalAIAnalysis({ proposal, open, onClose }: ProposalAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIViabilityAnalysis | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotResponse, setCopilotResponse] = useState("");
  
  const { analyzeViability, askCopilot, isLoading } = useCreditAI();
  const { data: banks = [] } = useBankPartners();

  const handleAnalyze = async () => {
    const result = await analyzeViability.mutateAsync({
      proposal,
      bankPartners: banks.map(b => ({ 
        id: b.id, 
        name: b.name, 
        terms: b.terms 
      })),
    });
    setAnalysis(result);
  };

  const handleCopilotAsk = async () => {
    if (!copilotQuestion.trim()) return;
    
    const result = await askCopilot.mutateAsync({
      proposal,
      question: copilotQuestion,
    });
    setCopilotResponse(result.response);
    setCopilotQuestion("");
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return CheckCircle2;
    if (score >= 40) return AlertTriangle;
    return XCircle;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Análise IA - {proposal.reference_number}
          </SheetTitle>
          <SheetDescription>
            Análise de viabilidade e matching bancário com IA
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!analysis ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-primary/50 mb-4" />
                <h3 className="font-medium mb-2">Análise IA Disponível</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                  A IA vai analisar a proposta, calcular probabilidade de aprovação 
                  e sugerir os melhores bancos para este perfil.
                </p>
                <Button onClick={handleAnalyze} disabled={analyzeViability.isPending}>
                  {analyzeViability.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Iniciar Análise
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="banks">Bancos</TabsTrigger>
                <TabsTrigger value="copilot">Copilot</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Score Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score de Viabilidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon = getScoreIcon(analysis.viability_score);
                          return <Icon className={`w-8 h-8 ${getScoreColor(analysis.viability_score)}`} />;
                        })()}
                        <div>
                          <p className={`text-3xl font-bold ${getScoreColor(analysis.viability_score)}`}>
                            {analysis.viability_score}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Prob. Aprovação: {analysis.approval_probability}%
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        analysis.risk_level === "low" ? "default" :
                        analysis.risk_level === "medium" ? "secondary" : "destructive"
                      }>
                        Risco {analysis.risk_level === "low" ? "Baixo" : 
                               analysis.risk_level === "medium" ? "Médio" : "Alto"}
                      </Badge>
                    </div>
                    <Progress value={analysis.viability_score} className="h-2" />
                  </CardContent>
                </Card>

                {/* Factors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Positive */}
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                        <TrendingUp className="w-4 h-4" />
                        Fatores Positivos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.positive_factors.map((f, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-green-800">{f.factor}</p>
                          <p className="text-green-600/80 text-xs">{f.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Negative */}
                  <Card className="border-red-200 bg-red-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                        <TrendingDown className="w-4 h-4" />
                        Fatores de Risco
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.negative_factors.map((f, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-red-800">{f.factor}</p>
                          <p className="text-red-600/80 text-xs">{f.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Optimization Tips */}
                {analysis.optimization_suggestions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Sugestões de Otimização
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.optimization_suggestions.map((s, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <Badge variant="outline" className={
                            s.priority === "high" ? "border-red-300 text-red-700" :
                            s.priority === "medium" ? "border-amber-300 text-amber-700" :
                            "border-gray-300"
                          }>
                            {s.priority === "high" ? "Alta" : 
                             s.priority === "medium" ? "Média" : "Baixa"}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {analysis.summary}
                </p>
              </TabsContent>

              <TabsContent value="banks" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Bancos Recomendados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.recommended_banks.map((bank, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{bank.bank_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Taxa estimada: {bank.estimated_rate}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {bank.match_score}%
                          </p>
                          <p className="text-xs text-muted-foreground">Match</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="copilot" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Copilot de Proposta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {copilotResponse && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm">{copilotResponse}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Pergunte algo sobre esta proposta..."
                        value={copilotQuestion}
                        onChange={(e) => setCopilotQuestion(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    <Button 
                      onClick={handleCopilotAsk} 
                      disabled={askCopilot.isPending || !copilotQuestion.trim()}
                      className="w-full"
                    >
                      {askCopilot.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Perguntar
                    </Button>

                    <div className="flex flex-wrap gap-2">
                      {[
                        "Como otimizar esta proposta?",
                        "Quais documentos faltam?",
                        "Qual o melhor prazo?",
                      ].map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          onClick={() => setCopilotQuestion(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
