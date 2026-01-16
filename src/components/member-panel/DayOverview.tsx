import { CalendarDays, Target, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DayOverviewProps {
  greeting: string;
  summaryText: string;
  meetingsCount: number;
  criticalTasks: number;
  riskyOpps: number;
  weeklyProgress: number;
  isLoading?: boolean;
}

export function DayOverview({
  greeting,
  summaryText,
  meetingsCount,
  criticalTasks,
  riskyOpps,
  weeklyProgress,
  isLoading,
}: DayOverviewProps) {
  const stats = [
    {
      label: 'Reuniões',
      value: meetingsCount,
      icon: CalendarDays,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Tarefas Críticas',
      value: criticalTasks,
      icon: Target,
      color: criticalTasks > 0 ? 'text-amber-500' : 'text-green-500',
      bgColor: criticalTasks > 0 ? 'bg-amber-500/10' : 'bg-green-500/10',
    },
    {
      label: 'Em Risco',
      value: riskyOpps,
      icon: AlertTriangle,
      color: riskyOpps > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: riskyOpps > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      label: 'Meta Semanal',
      value: `${weeklyProgress}%`,
      icon: TrendingUp,
      color: weeklyProgress >= 80 ? 'text-green-500' : weeklyProgress >= 50 ? 'text-amber-500' : 'text-red-500',
      bgColor: weeklyProgress >= 80 ? 'bg-green-500/10' : weeklyProgress >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10',
    },
  ];

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/30 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Resumo do Dia</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {greeting}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {summaryText}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "relative p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-md",
                stat.bgColor,
                "backdrop-blur-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
