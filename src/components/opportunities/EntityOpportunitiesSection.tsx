import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpportunitiesEnhanced, usePipelineStagesEnhanced, useCloseOpportunity } from "@/hooks/useOpportunitiesEnhanced";
import { Opportunity } from "@/types/opportunity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Target,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
  Lightbulb,
  Zap,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Plus,
  RefreshCw,
  Brain,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpportunityDetailDialog } from "@/components/opportunities/OpportunityDetailDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";

interface EntityOpportunitiesSectionProps {
  entityType: "lead" | "contact" | "company";
  entityId: string;
  entityName: string;
  entityIndustry?: string;
  entityNotes?: string;
}

interface OpportunityCoaching {
  overallScore: number;
  overallHealth: "excellent" | "good" | "attention" | "critical";
  opportunityAnalysis: Array<{
    opportunityId: string;
    diagnosis: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    riskReason?: string;
    winProbability: number;
    nextAction: {
      action: string;
      priority: "now" | "today" | "this_week" | "soon";
      impact: "high" | "medium" | "low";
    };
    closePrediction: {
      likelihood: "very_likely" | "likely" | "uncertain" | "unlikely";
      estimatedDays: number;
      blockers?: string[];
    };
    coachingTips?: string[];
  }>;
  strategicRecommendations: Array<{
    category: "urgency" | "relationship" | "value" | "process" | "timing";
    title: string;
    description: string;
    expectedOutcome?: string;
  }>;
  quickWins: string[];
  totalPipelineValue?: number;
  weightedValue?: number;
  expectedCloseValue?: number;
  generatedAt: string;
}

export function EntityOpportunitiesSection({
  entityType,
  entityId,
  entityName,
  entityIndustry,
  entityNotes,
}: EntityOpportunitiesSectionProps) {
  const { data: allOpportunities = [], isLoading: isLoadingOpps } = useOpportunitiesEnhanced();
  const closeOpportunity = useCloseOpportunity();
  
  const [coaching, setCoaching] = useState<OpportunityCoaching | null>(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Filter opportunities for this entity
  const opportunities = useMemo(() => {
    const fieldMap = {
      lead: "lead_id",
      contact: "contact_id",
      company: "company_id",
    };
    const field = fieldMap[entityType];
    return allOpportunities.filter((opp) => (opp as any)[field] === entityId);
  }, [allOpportunities, entityType, entityId]);

  // Calculate stats
  const stats = useMemo(() => {
    const open = opportunities.filter((o) => o.status === "open");
    const won = opportunities.filter((o) => o.status === "won");
    const lost = opportunities.filter((o) => o.status === "lost");
    
    const totalValue = open.reduce((sum, o) => sum + Number(o.value || 0), 0);
    const weightedValue = open.reduce((sum, o) => {
      return sum + (Number(o.value || 0) * (o.probability || 50) / 100);
    }, 0);
    const wonValue = won.reduce((sum, o) => sum + Number(o.value || 0), 0);
    const winRate = won.length + lost.length > 0 
      ? (won.length / (won.length + lost.length)) * 100 
      : 0;

    return {
      total: opportunities.length,
      open: open.length,
      won: won.length,
      lost: lost.length,
      totalValue,
      weightedValue,
      wonValue,
      winRate,
    };
  }, [opportunities]);

  const fetchCoaching = async () => {
    if (opportunities.length === 0) return;
    
    setIsLoadingCoaching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-opportunity-coach", {
        body: {
          opportunities: opportunities.map((opp) => ({
            id: opp.id,
            title: opp.title,
            value: opp.value,
            probability: opp.probability,
            status: opp.status,
            expected_close_date: opp.expected_close_date,
            stage: opp.stage,
            lead: opp.lead,
            contact: opp.contact,
            company: opp.company,
            source: opp.source,
            notes: opp.notes,
            created_at: opp.created_at,
            last_activity_at: opp.last_activity_at,
            ai_temperature: opp.ai_temperature,
          })),
          entityContext: {
            name: entityName,
            type: entityType,
            industry: entityIndustry,
            notes: entityNotes,
          },
        },
      });

      if (error) throw error;
      setCoaching(data);
      toast.success("Análise de oportunidades concluída");
    } catch (error) {
      console.error("Error fetching coaching:", error);
      toast.error("Erro ao analisar oportunidades");
    } finally {
      setIsLoadingCoaching(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "excellent": return "text-green-600 bg-green-50";
      case "good": return "text-blue-600 bg-blue-50";
      case "attention": return "text-amber-600 bg-amber-50";
      case "critical": return "text-red-600 bg-red-50";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "border-green-500/30 bg-green-50/50";
      case "medium": return "border-amber-500/30 bg-amber-50/50";
      case "high": return "border-orange-500/30 bg-orange-50/50";
      case "critical": return "border-red-500/30 bg-red-50/50";
      default: return "";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "now": return <Badge variant="destructive" className="text-xs">Agora</Badge>;
      case "today": return <Badge className="bg-amber-500 text-xs">Hoje</Badge>;
      case "this_week": return <Badge variant="secondary" className="text-xs">Esta semana</Badge>;
      default: return <Badge variant="outline" className="text-xs">Em breve</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "urgency": return <Zap className="w-4 h-4 text-red-500" />;
      case "relationship": return <Target className="w-4 h-4 text-blue-500" />;
      case "value": return <DollarSign className="w-4 h-4 text-green-500" />;
      case "process": return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      case "timing": return <Calendar className="w-4 h-4 text-amber-500" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  if (isLoadingOpps) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Pipeline de Oportunidades
            </CardTitle>
            <div className="flex items-center gap-2">
              {opportunities.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCoaching}
                  disabled={isLoadingCoaching}
                  className="gap-2"
                >
                  {isLoadingCoaching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  {coaching ? "Reanalisar" : "Coach IA"}
                </Button>
              )}
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Oportunidade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-2">Sem oportunidades associadas</p>
              <p className="text-sm text-muted-foreground">
                Crie uma oportunidade para começar a acompanhar negócios
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Abertas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                <p className="text-xs text-muted-foreground">Em Pipeline</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.weightedValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Ponderado</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats.winRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Coaching Panel */}
      {coaching && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Coach de Vendas IA
              </CardTitle>
              <div className={cn("px-3 py-1 rounded-full text-sm font-medium", getHealthColor(coaching.overallHealth))}>
                {coaching.overallHealth === "excellent" && "Excelente"}
                {coaching.overallHealth === "good" && "Bom"}
                {coaching.overallHealth === "attention" && "Atenção"}
                {coaching.overallHealth === "critical" && "Crítico"}
                {" • "}
                {coaching.overallScore}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Wins */}
            {coaching.quickWins.length > 0 && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Vitórias Rápidas</span>
                </div>
                <ul className="space-y-1">
                  {coaching.quickWins.map((win, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {win}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategic Recommendations */}
            {coaching.strategicRecommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Recomendações Estratégicas
                </h4>
                <div className="grid gap-2">
                  {coaching.strategicRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      {getCategoryIcon(rec.category)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                        {rec.expectedOutcome && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            {rec.expectedOutcome}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Value */}
            {coaching.expectedCloseValue !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <span className="text-sm text-muted-foreground">Valor Provável de Fecho</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(coaching.expectedCloseValue)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Opportunities List - Clean Design */}
      {opportunities.length > 0 && (
        <div className="space-y-3">
          {opportunities.map((opp) => {
            const analysis = coaching?.opportunityAnalysis.find((a) => a.opportunityId === opp.id);

            return (
              <Card
                key={opp.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  analysis ? getRiskColor(analysis.riskLevel) : ""
                )}
                onClick={() => setSelectedOpportunity(opp)}
              >
                <CardContent className="p-4">
                  {/* Title */}
                  <h4 className="font-semibold text-sm mb-3 truncate">{opp.title}</h4>
                  
                  {/* 2x2 Grid Layout */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Revenue</p>
                      <p className="font-medium">{formatCurrency(Number(opp.value))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stage</p>
                      <p className="font-medium">{opp.stage?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Close Date</p>
                      <p className="font-medium">
                        {opp.expected_close_date 
                          ? new Date(opp.expected_close_date).toISOString().split('T')[0]
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Probability (%)</p>
                      <p className="font-medium text-primary">{opp.probability || 50}%</p>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOpportunity(opp);
                    }}
                  >
                    View Details
                  </Button>

                  {/* AI Analysis (if available) */}
                  {analysis && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{analysis.diagnosis}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {selectedOpportunity && (
        <OpportunityDetailDialog
          opportunity={selectedOpportunity}
          open={!!selectedOpportunity}
          onOpenChange={(open) => !open && setSelectedOpportunity(null)}
          onMarkAsWon={async () => {
            await closeOpportunity.mutateAsync({ id: selectedOpportunity.id, status: "won" });
            toast.success("Oportunidade marcada como ganha!");
            setSelectedOpportunity(null);
          }}
          onMarkAsLost={async () => {
            await closeOpportunity.mutateAsync({ id: selectedOpportunity.id, status: "lost" });
            toast.success("Oportunidade marcada como perdida");
            setSelectedOpportunity(null);
          }}
        />
      )}

      <CreateOpportunityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
