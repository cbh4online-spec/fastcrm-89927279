import { useMemberPanel } from '@/hooks/useMemberPanel';
import { DayOverview } from './DayOverview';
import { AIPriorities } from './AIPriorities';
import { TodayMeetings } from './TodayMeetings';
import { OpportunitiesDeals } from './OpportunitiesDeals';
import { PerformanceGoals } from './PerformanceGoals';
import { AICoachSidebar } from './AICoachSidebar';
import { PersonalAlerts } from './PersonalAlerts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function MemberPanel() {
  const {
    isLoading,
    greeting,
    daySummary,
    meetings,
    priorities,
    opportunities,
    performance,
    alerts,
    updatePriorityStatus,
  } = useMemberPanel();

  const handleCompletePriority = (id: string) => {
    updatePriorityStatus(id, 'completed');
    toast.success('Tarefa concluída! 🎉');
  };

  const handleDeferPriority = (id: string) => {
    updatePriorityStatus(id, 'deferred');
    toast.info('Tarefa adiada para mais tarde');
  };

  const handleIgnorePriority = (id: string) => {
    updatePriorityStatus(id, 'ignored');
    toast.info('Tarefa ignorada (feedback guardado)');
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex">
      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-5xl">
          {/* 1. Day Overview */}
          <DayOverview
            greeting={greeting}
            summaryText={daySummary.summaryText}
            meetingsCount={daySummary.meetingsCount}
            criticalTasks={daySummary.criticalTasks}
            riskyOpps={daySummary.riskyOpps}
            weeklyProgress={daySummary.weeklyProgress}
            isLoading={isLoading}
          />

          {/* 2. AI Priorities */}
          <AIPriorities
            priorities={priorities}
            onComplete={handleCompletePriority}
            onDefer={handleDeferPriority}
            onIgnore={handleIgnorePriority}
            isLoading={isLoading}
          />

          {/* 3 & 4. Meetings and Opportunities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TodayMeetings
              meetings={meetings}
              isLoading={isLoading}
              onPrepareMeeting={(m) => toast.info(`Preparar: ${m.title}`)}
              onOpenClient={(m) => toast.info('Abrir cliente')}
              onSendMessage={(m) => toast.info('Enviar mensagem')}
              onReschedule={(m) => toast.info('Reagendar')}
            />
            <OpportunitiesDeals
              opportunities={opportunities}
              isLoading={isLoading}
            />
          </div>

          {/* 5 & 6. Performance and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceGoals
              performance={performance}
              isLoading={isLoading}
            />
            <PersonalAlerts
              alerts={alerts}
              isLoading={isLoading}
              onDismiss={(id) => toast.info('Alerta descartado')}
            />
          </div>
        </div>
      </ScrollArea>

      {/* AI Coach Sidebar */}
      <div className="hidden xl:block w-80 border-l bg-muted/10">
        <AICoachSidebar />
      </div>
    </div>
  );
}
