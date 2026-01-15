import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Calendar, Target, HelpCircle, AlertCircle } from "lucide-react";
import { Forecast, ForecastPeriod } from "@/types/kpis";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ForecastSectionProps {
  forecast: Forecast | null;
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

function ForecastCard({ period, isFirst }: { period: ForecastPeriod; isFirst: boolean }) {
  const confidenceColor = useMemo(() => {
    if (period.confidence >= 70) return "text-green-600";
    if (period.confidence >= 50) return "text-amber-600";
    return "text-muted-foreground";
  }, [period.confidence]);

  return (
    <Card className={cn(
      "relative overflow-hidden",
      isFirst && "border-primary/50 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge variant={isFirst ? "default" : "secondary"} className="font-normal">
            {period.label}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-1 text-xs", confidenceColor)}>
                <span>{period.confidence}%</span>
                <HelpCircle className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Nível de confiança baseado no histórico de dados</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Receita prevista</p>
            <p className={cn(
              "text-2xl font-bold",
              isFirst && "text-primary"
            )}>
              {formatCurrency(period.expectedRevenue)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {period.expectedDeals} negócio{period.expectedDeals !== 1 ? "s" : ""} esperado{period.expectedDeals !== 1 ? "s" : ""}
            </span>
          </div>

          <Progress 
            value={period.confidence} 
            className="h-1.5" 
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastSection({ forecast, isLoading }: ForecastSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Ainda não há dados suficientes para previsões.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            À medida que usares o sistema, isto melhora automaticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalExpectedRevenue = forecast.periods.reduce((sum, p) => sum + p.expectedRevenue, 0);
  const hasMeaningfulData = totalExpectedRevenue > 0 || forecast.basedOnHistory;

  if (!hasMeaningfulData) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Cria oportunidades para ativar previsões.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As previsões baseiam-se nas tuas oportunidades ativas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Previsões</h3>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="font-normal cursor-help">
              {forecast.basedOnHistory ? "Baseado no histórico" : "Estimativa inicial"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{forecast.explanation}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {forecast.periods.map((period, index) => (
          <ForecastCard 
            key={period.period} 
            period={period} 
            isFirst={index === 0}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {forecast.explanation}
      </p>
    </div>
  );
}
