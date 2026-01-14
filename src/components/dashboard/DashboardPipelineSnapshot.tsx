import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  count: number;
  value: number;
  isStalled: boolean;
  stalledCount?: number;
}

interface DashboardPipelineSnapshotProps {
  stages: PipelineStage[];
  totalValue: number;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${value.toFixed(0)}`;
}

function StageBar({ 
  stage, 
  maxValue,
  onClick 
}: { 
  stage: PipelineStage; 
  maxValue: number;
  onClick: () => void;
}) {
  const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={onClick}
            className={cn(
              "w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm",
              stage.isStalled && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium truncate">{stage.name}</span>
                {stage.isStalled && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {stage.count}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Progress 
                value={percentage} 
                className="h-1.5"
                style={{ 
                  backgroundColor: `${stage.color}20`,
                }}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCurrency(stage.value)}
                </span>
                {stage.isStalled && stage.stalledCount && (
                  <span className="text-amber-600">
                    {stage.stalledCount} parado{stage.stalledCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-xs">
            <p className="font-medium">{stage.name}</p>
            <p>{stage.count} oportunidade{stage.count !== 1 ? 's' : ''}</p>
            <p>Valor: {formatCurrency(stage.value)}</p>
            {stage.isStalled && (
              <p className="text-amber-500 mt-1">
                ⚠️ {stage.stalledCount} sem movimento há +7 dias
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DashboardPipelineSnapshot({ 
  stages, 
  totalValue,
  isLoading 
}: DashboardPipelineSnapshotProps) {
  const navigate = useNavigate();
  const maxValue = Math.max(...stages.map(s => s.value), 1);
  const stalledStages = stages.filter(s => s.isStalled);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Pipeline
            </CardTitle>
            <CardDescription className="text-xs">
              Valor total: {formatCurrency(totalValue)}
            </CardDescription>
          </div>
          {stalledStages.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stalledStages.length} etapa{stalledStages.length > 1 ? 's' : ''} parada{stalledStages.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Sem oportunidades</p>
            <p className="text-xs mt-1">Crie a primeira oportunidade para ver o pipeline.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((stage) => (
              <StageBar
                key={stage.id}
                stage={stage}
                maxValue={maxValue}
                onClick={() => navigate(`/dashboard/opportunities?stage=${stage.id}`)}
              />
            ))}
            
            <Button 
              variant="ghost" 
              className="w-full mt-2 text-xs"
              onClick={() => navigate("/dashboard/opportunities")}
            >
              Ver pipeline completo
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { PipelineStage };
