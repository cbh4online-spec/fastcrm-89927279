import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Sparkles,
  Target,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Brain,
  Zap,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProductivityCoach, AIPrioritySuggestion, GoalPeriod } from '@/hooks/useProductivityCoach';
import { useMeetings } from '@/hooks/useMeetings';
import { useToast } from '@/hooks/use-toast';

export function DailyCoachPanel() {
  const { toast } = useToast();
  const {
    priorities,
    prioritiesLoading,
    goals,
    generatePriorities,
    savePriorities,
    completePriority,
    analyzeGoals,
  } = useProductivityCoach();

  const { meetings, isLoading: meetingsLoading } = useMeetings();
  const [aiSuggestions, setAiSuggestions] = useState<AIPrioritySuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [goalAnalysis, setGoalAnalysis] = useState<any>(null);

  const today = new Date();
  const todaysMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.start_time);
    return (
      meetingDate.toDateString() === today.toDateString() &&
      m.status !== 'cancelled'
    );
  });

  const dailyGoals = goals.filter((g) => g.period === 'daily');
  const weeklyGoals = goals.filter((g) => g.period === 'weekly');

  const handleGeneratePriorities = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePriorities.mutateAsync();
      setAiSuggestions(result.priorities || []);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptPriorities = async () => {
    if (aiSuggestions.length > 0) {
      await savePriorities.mutateAsync(aiSuggestions);
      setAiSuggestions([]);
    }
  };

  const handleAnalyzeGoals = async (period: GoalPeriod) => {
    const result = await analyzeGoals.mutateAsync(period);
    setGoalAnalysis(result);
  };

  const completedPriorities = priorities.filter((p) => p.is_completed).length;
  const progressPercentage = priorities.length > 0 
    ? (completedPriorities / priorities.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Coach de Produtividade
          </h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
        <Button onClick={handleGeneratePriorities} disabled={isGenerating}>
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? 'A gerar...' : 'Sugerir Prioridades'}
        </Button>
      </div>

      {/* AI Suggestions Modal */}
      {aiSuggestions.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              Prioridades Sugeridas pela IA
            </CardTitle>
            <CardDescription>
              Baseado na tua agenda, follow-ups e metas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-primary mt-1">{suggestion.reasoning}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAiSuggestions([])}>
                Descartar
              </Button>
              <Button onClick={handleAcceptPriorities}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aceitar Prioridades
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Priorities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top 3 Prioridades de Hoje
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {completedPriorities}/{priorities.length} concluídas
                </span>
                <Progress value={progressPercentage} className="w-20 h-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {prioritiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : priorities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sem prioridades definidas para hoje.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleGeneratePriorities}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar com IA
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {priorities.map((priority) => (
                  <div
                    key={priority.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border transition-all',
                      priority.is_completed
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <button
                      onClick={() =>
                        completePriority.mutate({
                          id: priority.id,
                          is_completed: !priority.is_completed,
                        })
                      }
                      className="mt-0.5"
                    >
                      {priority.is_completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{priority.position}
                        </Badge>
                        <h4
                          className={cn(
                            'font-medium',
                            priority.is_completed && 'line-through text-muted-foreground'
                          )}
                        >
                          {priority.title}
                        </h4>
                        {priority.ai_generated && (
                          <Sparkles className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {priority.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {priority.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Reuniões de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : todaysMeetings.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sem reuniões hoje</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {todaysMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3 rounded-lg border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {format(new Date(meeting.start_time), 'HH:mm')}
                          </span>
                        </div>
                        <Badge
                          variant={
                            meeting.category === 'client'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {meeting.category === 'client' ? 'Cliente' : 'Interna'}
                        </Badge>
                      </div>
                      <h4 className="font-medium mt-2 text-sm">{meeting.title}</h4>
                      {meeting.contact?.name && (
                        <p className="text-xs text-muted-foreground">
                          com {meeting.contact.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { period: 'daily' as GoalPeriod, label: 'Diárias', icon: Zap },
          { period: 'weekly' as GoalPeriod, label: 'Semanais', icon: TrendingUp },
          { period: 'monthly' as GoalPeriod, label: 'Mensais', icon: Target },
          { period: 'annual' as GoalPeriod, label: 'Anuais', icon: Trophy },
        ].map(({ period, label, icon: Icon }) => {
          const periodGoals = goals.filter((g) => g.period === period);
          const completed = periodGoals.filter((g) => g.status === 'completed').length;
          const total = periodGoals.length;
          const progress = total > 0 ? (completed / total) * 100 : 0;

          return (
            <Card key={period} className="hover:border-primary/50 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">Metas {label}</span>
                  </div>
                  <Badge variant="outline">
                    {completed}/{total}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {progress.toFixed(0)}% concluído
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Goal Analysis Card */}
      {goalAnalysis && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Análise de Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  goalAnalysis.overall_status === 'on_track' || goalAnalysis.overall_status === 'ahead'
                    ? 'default'
                    : 'destructive'
                }
              >
                {goalAnalysis.overall_status === 'on_track' && 'No Caminho'}
                {goalAnalysis.overall_status === 'ahead' && 'À Frente'}
                {goalAnalysis.overall_status === 'at_risk' && 'Em Risco'}
                {goalAnalysis.overall_status === 'behind' && 'Atrasado'}
              </Badge>
            </div>
            <p className="text-sm">{goalAnalysis.summary}</p>
            {goalAnalysis.motivation && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm italic">{goalAnalysis.motivation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
