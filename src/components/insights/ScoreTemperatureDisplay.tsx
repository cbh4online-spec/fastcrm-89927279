import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EntityScore, TEMPERATURE_CONFIG, ScoreFactor } from '@/types/aiInsights';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface ScoreTemperatureDisplayProps {
  score: EntityScore | null;
  isLoading?: boolean;
  compact?: boolean;
  showFactors?: boolean;
}

export function ScoreTemperatureDisplay({
  score,
  isLoading,
  compact = false,
  showFactors = true,
}: ScoreTemperatureDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card className="border-dashed">
        <CardContent className={cn("p-4 text-center", compact && "p-3")}>
          <p className="text-sm text-muted-foreground">
            Score não calculado ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  const tempConfig = TEMPERATURE_CONFIG[score.temperature];
  const scoreColor = 
    score.value >= 75 ? 'bg-green-500' :
    score.value >= 50 ? 'bg-amber-500' :
    score.value >= 25 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <Card>
      <CardContent className={cn("p-4 space-y-4", compact && "p-3 space-y-3")}>
        {/* Score Display */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Score</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Score calculado com base em engajamento, atividade e potencial
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={score.value} className="h-2" />
            </div>
            <span className="text-lg font-bold tabular-nums min-w-[40px] text-right">
              {score.value}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Temperatura</span>
          <Badge className={cn(tempConfig.bgColor, tempConfig.color, "gap-1")}>
            <span>{tempConfig.emoji}</span>
            <span>{tempConfig.label}</span>
          </Badge>
        </div>

        {/* Factors */}
        {showFactors && score.factors.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              Fatores de influência
            </span>
            <div className="space-y-1.5">
              {score.factors.slice(0, compact ? 3 : 5).map((factor, index) => (
                <FactorRow key={index} factor={factor} />
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {score.lastUpdated && (
          <p className="text-[10px] text-muted-foreground text-right">
            Atualizado {new Date(score.lastUpdated).toLocaleString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FactorRow({ factor }: { factor: ScoreFactor }) {
  const impactConfig = {
    positive: { Icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
    negative: { Icon: TrendingDown, color: 'text-red-600 dark:text-red-400' },
    neutral: { Icon: Minus, color: 'text-muted-foreground' },
  };

  const config = impactConfig[factor.impact];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs cursor-help">
            <config.Icon className={cn("h-3 w-3 flex-shrink-0", config.color)} />
            <span className="truncate">{factor.name}</span>
            <span className={cn(
              "ml-auto tabular-nums font-medium",
              factor.impact === 'positive' ? 'text-green-600' : 
              factor.impact === 'negative' ? 'text-red-600' : 
              'text-muted-foreground'
            )}>
              {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}
              {Math.abs(factor.weight)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">{factor.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
