import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineSummary } from "@/hooks/useOperationalDashboard";

interface DashboardPipelineSummaryProps {
  data: PipelineSummary | null;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function DashboardPipelineSummary({ data, isLoading }: DashboardPipelineSummaryProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline Resumido</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.opportunityCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Pipeline Resumido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Sem oportunidades</p>
            <p className="text-xs mt-1">Cria a primeira oportunidade para ver o pipeline.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate("/dashboard/opportunities")}
            >
              Ir para oportunidades
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.stages.map(s => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Pipeline Resumido
            </CardTitle>
            <CardDescription className="text-xs">Leitura rápida do estado dos negócios</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/dashboard/opportunities")}
          >
            Ver tudo
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{formatCurrency(data.totalValue)}</p>
            <p className="text-xs text-muted-foreground">Total em pipeline</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{data.opportunityCount}</p>
            <p className="text-xs text-muted-foreground">Oportunidades</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            {data.mostCongestedStage ? (
              <>
                <p className="text-sm font-bold flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {data.mostCongestedStage.name}
                </p>
                <p className="text-xs text-muted-foreground">{data.mostCongestedStage.count} oport. congestionada</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">—</p>
                <p className="text-xs text-muted-foreground">Sem congestionamento</p>
              </>
            )}
          </div>
        </div>

        {/* Stage bars */}
        <div className="space-y-2">
          {data.stages.filter(s => s.count > 0).map((stage) => {
            const percentage = (stage.value / maxValue) * 100;
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: stage.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{stage.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{stage.count}</Badge>
                      <span className="text-xs text-muted-foreground">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
