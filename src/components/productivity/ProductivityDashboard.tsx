import { useState, useMemo } from 'react';
import { Brain, Target, Zap, TrendingUp, Calendar, RefreshCw, CheckCircle2, Download, FileDown, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DailyCoachPanel } from '@/components/productivity/DailyCoachPanel';
import { GoalsManager } from '@/components/productivity/GoalsManager';
import { DocumentListLayout } from '@/components/documents/listing/DocumentListLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useProductivityCoach } from '@/hooks/useProductivityCoach';
import { useMeetings } from '@/hooks/useMeetings';
import { useWeeklyPerformance } from '@/hooks/useWeeklyPerformance';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { exportProductivityPDF, exportProductivityCSV } from '@/utils/productivityExport';
import { toast } from 'sonner';

type ActiveTab = 'coach' | 'goals';

interface ChipProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function Chip({ active, onClick, icon, label, count }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface KpiProps {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'primary' | 'blue' | 'amber' | 'purple' | 'green';
  onClick?: () => void;
}

const toneStyles: Record<KpiProps['tone'], string> = {
  primary: 'bg-primary/10 text-primary',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
};

function Kpi({ label, value, hint, icon, tone, onClick }: KpiProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneStyles[tone])}>
        {icon}
      </div>
    </button>
  );
}

export function ProductivityDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('coach');
  const [searchValue, setSearchValue] = useState('');

  const { priorities, prioritiesLoading, goals, goalsLoading } = useProductivityCoach();
  const { meetings, isLoading: meetingsLoading } = useMeetings();
  const { data: weeklyData } = useWeeklyPerformance();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

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

  const handleExport = (mode: 'daily' | 'weekly', format: 'pdf' | 'csv') => {
    const exportData = {
      priorities,
      goals,
      meetings,
      weeklyMetrics: weeklyData?.metrics,
      weekLabel: weeklyData?.weekLabel,
      workspaceName: currentWorkspace?.name || '',
      userName: user?.user_metadata?.full_name || '',
    };

    try {
      if (format === 'pdf') {
        exportProductivityPDF(mode, exportData);
      } else {
        exportProductivityCSV(mode, exportData);
      }
      toast.success(`Briefing ${mode === 'daily' ? 'diário' : 'semanal'} exportado!`);
    } catch (err) {
      toast.error('Erro ao exportar');
      console.error('Export error:', err);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['productivity-priorities'] });
    queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
  };

  const primaryAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-12 gap-2 rounded-full px-5">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] bg-popover z-50">
        <DropdownMenuLabel>Briefing PDF</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport('daily', 'pdf')} className="gap-2">
          <FileDown className="h-4 w-4 text-red-500" />
          Briefing Diário (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('weekly', 'pdf')} className="gap-2">
          <FileDown className="h-4 w-4 text-red-500" />
          Briefing Semanal (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Dados CSV</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport('daily', 'csv')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-500" />
          Dados Diários (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('weekly', 'csv')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-500" />
          Dados Semanais (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const secondaryAction = (
    <Button
      variant="outline"
      onClick={handleRefresh}
      className="h-12 gap-2 rounded-full border-border bg-card px-4"
    >
      <RefreshCw className="h-4 w-4" />
      Atualizar
    </Button>
  );

  const chips = (
    <>
      <Chip
        active={activeTab === 'coach'}
        onClick={() => setActiveTab('coach')}
        icon={<Brain className="h-4 w-4" />}
        label="Coach Diário"
      />
      <Chip
        active={activeTab === 'goals'}
        onClick={() => setActiveTab('goals')}
        icon={<Target className="h-4 w-4" />}
        label="Metas"
        count={stats.totalGoals}
      />
    </>
  );

  const summary = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {isLoading ? (
        <>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </>
      ) : (
        <>
          <Kpi
            label="Prioridades hoje"
            value={`${stats.completedPriorities}/${stats.priorities}`}
            hint={`${stats.priorityProgress}% concluído`}
            icon={stats.priorityProgress >= 100 ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            tone={stats.priorityProgress >= 100 ? 'green' : 'primary'}
            onClick={() => setActiveTab('coach')}
          />
          <Kpi
            label="Reuniões hoje"
            value={String(stats.meetings)}
            hint="agendadas"
            icon={<Calendar className="h-5 w-5" />}
            tone="blue"
            onClick={() => navigate('/dashboard/scheduling')}
          />
          <Kpi
            label="Metas ativas"
            value={String(stats.totalGoals)}
            hint={`${stats.completedGoals} concluídas`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="amber"
            onClick={() => setActiveTab('goals')}
          />
          <Kpi
            label="Diárias / Semanais"
            value={`${stats.dailyGoals} / ${stats.weeklyGoals}`}
            hint="metas por período"
            icon={<Zap className="h-5 w-5" />}
            tone="purple"
            onClick={() => setActiveTab('goals')}
          />
        </>
      )}
    </div>
  );

  return (
    <DocumentListLayout
      title="Produtividade"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder={activeTab === 'coach' ? 'Pesquisar prioridades...' : 'Pesquisar metas...'}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      chips={chips}
      summary={summary}
    >
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        {activeTab === 'coach' && <DailyCoachPanel />}
        {activeTab === 'goals' && <GoalsManager />}
      </div>
    </DocumentListLayout>
  );
}
