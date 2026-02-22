import { useState, useMemo } from 'react';
import { Brain, Target, Zap, TrendingUp, Trophy, Calendar, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DailyCoachPanel } from '@/components/productivity/DailyCoachPanel';
import { GoalsManager } from '@/components/productivity/GoalsManager';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProductivityCoach } from '@/hooks/useProductivityCoach';
import { useMeetings } from '@/hooks/useMeetings';
import { useQueryClient } from '@tanstack/react-query';

type ActiveTab = 'coach' | 'goals';

export function ProductivityDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('coach');
  const [searchValue, setSearchValue] = useState('');

  // Data hooks
  const { priorities, prioritiesLoading, goals, goalsLoading } = useProductivityCoach();
  const { meetings, isLoading: meetingsLoading } = useMeetings();

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    const todaysMeetings = meetings.filter((m) => {
      const meetingDate = new Date(m.start_time);
      return meetingDate.toDateString() === today.toDateString() && m.status !== 'cancelled';
    });

    const completedPriorities = priorities.filter((p) => p.is_completed).length;
    const dailyGoals = goals.filter((g) => g.period === 'daily');
    const weeklyGoals = goals.filter((g) => g.period === 'weekly');
    const monthlyGoals = goals.filter((g) => g.period === 'monthly');
    const completedGoals = goals.filter((g) => g.status === 'completed').length;

    return {
      priorities: priorities.length,
      completedPriorities,
      priorityProgress: priorities.length > 0 ? Math.round((completedPriorities / priorities.length) * 100) : 0,
      meetings: todaysMeetings.length,
      totalGoals: goals.length,
      completedGoals,
      dailyGoals: dailyGoals.length,
      weeklyGoals: weeklyGoals.length,
      monthlyGoals: monthlyGoals.length,
    };
  }, [priorities, goals, meetings]);

  const isLoading = prioritiesLoading || goalsLoading || meetingsLoading;

  // Page tabs
  const pageTabs = [
    { id: 'coach', label: 'Coach Diário', icon: <Brain className="h-4 w-4" /> },
    { id: 'goals', label: 'Metas', icon: <Target className="h-4 w-4" />, count: stats.totalGoals },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['productivity-priorities'] });
    queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <PageHeader
        title="Produtividade"
        count={stats.totalGoals}
        description="Maximize a sua produtividade com coaching IA e gestão de metas"
        tabs={pageTabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* KPI Cards */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </>
          ) : (
            <>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab('coach')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Prioridades Hoje</p>
                      <p className="text-2xl font-bold">{stats.completedPriorities}/{stats.priorities}</p>
                    </div>
                    <div className={cn(
                      'p-2 rounded-lg',
                      stats.priorityProgress >= 100 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'
                    )}>
                      {stats.priorityProgress >= 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Target className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.priorityProgress}% concluído</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/calendar')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Reuniões Hoje</p>
                      <p className="text-2xl font-bold">{stats.meetings}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">agendadas</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab('goals')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Metas Ativas</p>
                      <p className="text-2xl font-bold">{stats.totalGoals}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.completedGoals} concluídas</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab('goals')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Diárias / Semanais</p>
                      <p className="text-2xl font-bold">{stats.dailyGoals} / {stats.weeklyGoals}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">metas por período</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder={activeTab === 'coach' ? 'Pesquisar prioridades...' : 'Pesquisar metas...'}
        onSearchChange={setSearchValue}
        rightActions={
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'coach' && <DailyCoachPanel />}
        {activeTab === 'goals' && <GoalsManager />}
      </div>
    </div>
  );
}
