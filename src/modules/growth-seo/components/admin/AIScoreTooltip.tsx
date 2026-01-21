import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, Lightbulb, Info } from "lucide-react";
import type { QualityScoreBreakdown, QualityFactor } from "../../utils/calculateQualityScore";
import { cn } from "@/lib/utils";

interface AIScoreTooltipProps {
  score: number;
  breakdown?: QualityScoreBreakdown | null;
  children?: React.ReactNode;
}

function getStatusIcon(status: QualityFactor['status']) {
  switch (status) {
    case 'excellent':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'good':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case 'warning':
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    case 'poor':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-600 dark:text-green-400";
  if (score >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(status: QualityFactor['status']): string {
  switch (status) {
    case 'excellent':
      return "bg-green-500";
    case 'good':
      return "bg-emerald-400";
    case 'warning':
      return "bg-amber-500";
    case 'poor':
      return "bg-red-500";
  }
}

export function AIScoreTooltip({ score, breakdown, children }: AIScoreTooltipProps) {
  const displayScore = Math.round(score * 100);
  const scoreColor = getScoreColor(score);

  // If no breakdown provided, show simple tooltip
  if (!breakdown) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {children || (
              <span className={cn("cursor-help tabular-nums font-medium", scoreColor)}>
                {displayScore}%
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            <p className="text-xs">
              Score de qualidade SEO baseado em métricas de conteúdo
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children || (
            <span className={cn("cursor-help tabular-nums font-medium", scoreColor)}>
              {displayScore}%
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          align="start"
          className="w-[320px] p-0 bg-popover border shadow-lg"
        >
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">AI Quality Score</span>
              <span className={cn("text-lg font-bold", scoreColor)}>
                {displayScore}%
              </span>
            </div>
            <Progress 
              value={displayScore} 
              className="h-2" 
            />
          </div>

          {/* Factors breakdown */}
          <div className="p-3 space-y-2 max-h-[240px] overflow-y-auto">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Fatores de Qualidade
            </p>
            {breakdown.factors.map((factor, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(factor.status)}
                    <span className="font-medium">{factor.name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {factor.score}/{factor.maxScore}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getProgressColor(factor.status)
                      )}
                      style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-16 text-right truncate">
                    {factor.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {breakdown.suggestions.length > 0 && (
            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium">Sugestões de Melhoria</span>
              </div>
              <ul className="space-y-1">
                {breakdown.suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
