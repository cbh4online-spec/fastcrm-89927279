import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  Sparkles,
  Award,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PerformanceMetrics } from '@/hooks/useMemberPanel';

interface PerformanceGoalsProps {
  performance: PerformanceMetrics | null;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function PerformanceGoals({
  performance,
  isLoading,
}: PerformanceGoalsProps) {
  if (isLoading || !performance) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { monthly, weekly, yearly, comparison, dealsToClose, meetingsNeeded } = performance;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Award className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Metas & Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Progresso atual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {comparison.vsLastMonth >= 0 ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 bg-green-500/10">
                <ArrowUp className="h-3 w-3" />
                +{comparison.vsLastMonth}%
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-red-600 border-red-500/30 bg-red-500/10">
                <ArrowDown className="h-3 w-3" />
                {comparison.vsLastMonth}%
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Main Monthly Goal */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Meta Mensal</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{formatCurrency(monthly.current)}</span>
              <span className="text-muted-foreground text-sm"> / {formatCurrency(monthly.target)}</span>
            </div>
          </div>
          <Progress 
            value={Math.min(monthly.percentage, 100)} 
            className={cn("h-3", getProgressColor(monthly.percentage))}
          />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              "font-medium",
              monthly.percentage >= 100 ? "text-green-600" : 
              monthly.percentage >= 75 ? "text-blue-600" : 
              monthly.percentage >= 50 ? "text-amber-600" : "text-red-600"
            )}>
              {monthly.percentage}%
            </span>
          </div>
        </div>

        {/* Secondary Goals Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Semanal</span>
            </div>
            <p className="text-lg font-bold">{weekly.percentage}%</p>
            <Progress value={Math.min(weekly.percentage, 100)} className="h-1.5 mt-1" />
          </div>
          
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Anual</span>
            </div>
            <p className="text-lg font-bold">{yearly.percentage}%</p>
            <Progress value={Math.min(yearly.percentage, 100)} className="h-1.5 mt-1" />
          </div>

          <div className={cn(
            "p-3 rounded-xl border",
            comparison.vsLastWeek >= 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {comparison.vsLastWeek >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-medium">Semana</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              comparison.vsLastWeek >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {comparison.vsLastWeek >= 0 ? '+' : ''}{comparison.vsLastWeek}%
            </p>
          </div>
        </div>

        {/* AI Suggestion */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Sugestão IA</p>
              <p className="text-sm text-muted-foreground">
                Para bater a meta deste mês, precisas de fechar{' '}
                <span className="font-semibold text-foreground">{dealsToClose} negócios</span> ou marcar{' '}
                <span className="font-semibold text-foreground">{meetingsNeeded} reuniões qualificadas</span>.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
