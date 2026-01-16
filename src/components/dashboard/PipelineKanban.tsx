import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const stageColors: Record<string, string> = {
  "Lead": "bg-blue-500",
  "Contacted": "bg-cyan-500",
  "In Proposal": "bg-amber-500",
  "Negotiation": "bg-orange-500",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-500",
};

const getStageColor = (stageName: string, stageColor?: string) => {
  if (stageColor) return stageColor;
  return stageColors[stageName] || "bg-primary";
};

export function PipelineKanban() {
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const navigate = useNavigate();

  const isLoading = oppsLoading || stagesLoading;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="min-w-[260px] space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.position - b.position);

  const getOpportunitiesForStage = (stageId: string) => {
    return (opportunities || []).filter(opp => opp.stage_id === stageId).slice(0, 3);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Pipeline de Vendas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {opportunities?.length || 0} oportunidades ativas
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/dashboard/opportunities")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {sortedStages.slice(0, 5).map((stage) => {
            const stageOpps = getOpportunitiesForStage(stage.id);
            const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);

            return (
              <div key={stage.id} className="min-w-[240px] flex-shrink-0">
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color || getStageColor(stage.name) }}
                    />
                    <span className="font-medium text-sm">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {stageOpps.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                {/* Opportunity Cards */}
                <div className="space-y-2">
                  {stageOpps.length === 0 ? (
                    <div className="h-20 rounded-xl border-2 border-dashed border-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Sem oportunidades</span>
                    </div>
                  ) : (
                    stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        onClick={() => navigate(`/dashboard/opportunities?selected=${opp.id}`)}
                        className="bg-muted/50 hover:bg-muted rounded-xl p-3 cursor-pointer transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src="" />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {opp.title?.slice(0, 2).toUpperCase() || "OP"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm line-clamp-1">{opp.title}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {opp.lead?.name || "Sem lead"}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                          >
                            {formatCurrency(opp.value || 0)}
                          </Badge>
                        </div>
                        {/* Progress bar based on stage position */}
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${Math.min((stage.position + 1) * 20, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
