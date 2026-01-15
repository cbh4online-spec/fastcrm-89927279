import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  Clock,
} from "lucide-react";
import { PipelineAnalysis, PipelineBottleneck } from "@/types/kpis";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PipelineHealthCardProps {
  analysis: PipelineAnalysis | null;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${value.toLocaleString("pt-PT")}`;
}

function StageBar({ stage, maxCount }: { stage: PipelineBottleneck; maxCount: number }) {
  const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shrink-0" 
            style={{ backgroundColor: stage.stageColor }}
          />
          <span className={cn(
            "truncate",
            stage.isBottleneck && "text-amber-600 dark:text-amber-400 font-medium"
          )}>
            {stage.stageName}
          </span>
          {stage.isBottleneck && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{stage.suggestion}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">{stage.count}</span>
          {stage.avgDaysInStage > 0 && (
            <span className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stage.avgDaysInStage}d
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            stage.isBottleneck ? "bg-amber-500" : "bg-primary"
          )}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: stage.isBottleneck ? undefined : stage.stageColor 
          }}
        />
      </div>
    </div>
  );
}

function HealthIndicator({ score }: { score: number }) {
  const status = useMemo(() => {
    if (score >= 70) return { label: "Saudável", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" };
    if (score >= 40) return { label: "Atenção", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" };
    return { label: "Crítico", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" };
  }, [score]);

  return (
    <div className="flex items-center gap-2">
      <div className={cn("p-1.5 rounded-full", status.bg)}>
        {score >= 70 ? (
          <CheckCircle2 className={cn("h-4 w-4", status.color)} />
        ) : (
          <AlertTriangle className={cn("h-4 w-4", status.color)} />
        )}
      </div>
      <div>
        <p className={cn("text-sm font-medium", status.color)}>{status.label}</p>
        <p className="text-xs text-muted-foreground">{score}% saúde do pipeline</p>
      </div>
    </div>
  );
}

export function PipelineHealthCard({ analysis, isLoading }: PipelineHealthCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.stages.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Configura o teu pipeline para ver a análise.
          </p>
          <Button 
            variant="link" 
            size="sm"
            onClick={() => navigate("/dashboard/settings/pipelines")}
          >
            Configurar pipeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...analysis.stages.map(s => s.count));
  const bottlenecks = analysis.stages.filter(s => s.isBottleneck);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Pipeline</CardTitle>
          </div>
          <HealthIndicator score={analysis.healthScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
          <div>
            <p className="text-muted-foreground">Em pipeline</p>
            <p className="text-lg font-semibold">{analysis.totalInPipeline} oportunidades</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Valor total</p>
            <p className="text-lg font-semibold">{formatCurrency(analysis.totalValue)}</p>
          </div>
        </div>

        {/* Bottleneck alert */}
        {bottlenecks.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {bottlenecks.length} etapa{bottlenecks.length > 1 ? "s" : ""} congestionada{bottlenecks.length > 1 ? "s" : ""}
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                {bottlenecks.map(b => b.stageName).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Stage breakdown */}
        <div className="space-y-3">
          {analysis.stages.map((stage) => (
            <StageBar key={stage.stageId} stage={stage} maxCount={maxCount} />
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate("/dashboard/opportunities")}
        >
          Ver pipeline completo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
