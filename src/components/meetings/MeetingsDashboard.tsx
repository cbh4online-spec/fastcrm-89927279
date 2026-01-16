import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  List,
  Kanban,
  Filter,
  Users,
  User,
  Building2,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MeetingCard } from './MeetingCard';
import { MeetingCreateModal } from './MeetingCreateModal';
import { MeetingOutcomeModal } from './MeetingOutcomeModal';
import { MeetingCloseModal } from './MeetingCloseModal';
import { MeetingPreparationPanel } from './MeetingPreparationPanel';
import { useMeetings, type Meeting, type MeetingStatus, type MeetingCategory, type MeetingOutcome, type CreateMeetingData } from '@/hooks/useMeetings';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board' | 'timeline';

const statusOrder: MeetingStatus[] = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

const statusLabels: Record<MeetingStatus, string> = {
  pending: 'Pendentes',
  confirmed: 'Confirmadas',
  cancelled: 'Canceladas',
  no_show: 'Sem comparência',
  completed: 'Concluídas',
};

const categoryFilters = [
  { value: 'all', label: 'Todas', icon: CalendarIcon },
  { value: 'client', label: 'Cliente', icon: User },
  { value: 'internal', label: 'Interna', icon: Users },
  { value: 'hybrid', label: 'Híbrida', icon: Building2 },
];

export function MeetingsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [meetingForOutcome, setMeetingForOutcome] = useState<Meeting | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [meetingForClose, setMeetingForClose] = useState<Meeting | null>(null);
  const [showPreparation, setShowPreparation] = useState(false);
  const [meetingForPreparation, setMeetingForPreparation] = useState<Meeting | null>(null);

  // Get date range for current week
  const dateRange = useMemo(() => ({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }), [currentDate]);

  const { 
    meetings, 
    meetingTypes,
    meetingsByStatus,
    isLoading,
    createMeeting,
    updateMeetingStatus,
    updateMeetingOutcome,
    createFollowUpTask,
    publishToTeam,
  } = useMeetings(dateRange);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      return true;
    });
  }, [meetings, categoryFilter, statusFilter]);

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleCreateMeeting = async (data: CreateMeetingData) => {
    await createMeeting(data);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowCreateModal(true);
  };

  const handleRegisterOutcome = (meeting: Meeting) => {
    // For client meetings, use the AI-powered close modal
    if (meeting.category === 'client' || meeting.category === 'hybrid') {
      setMeetingForClose(meeting);
      setShowCloseModal(true);
    } else {
      // For internal meetings, use the simple outcome modal
      setMeetingForOutcome(meeting);
      setShowOutcomeModal(true);
    }
  };

  const handleSaveOutcome = async (
    outcome: MeetingOutcome,
    outcomeNotes?: string,
    nextSteps?: string,
    followUpDate?: string
  ) => {
    const targetMeeting = meetingForOutcome || meetingForClose;
    if (!targetMeeting) return;
    await updateMeetingOutcome(
      targetMeeting.id,
      outcome,
      outcomeNotes,
      nextSteps,
      followUpDate
    );
    setShowOutcomeModal(false);
    setMeetingForOutcome(null);
    setShowCloseModal(false);
    setMeetingForClose(null);
  };

  const handleCreateTask = async (title: string, description?: string, dueDate?: string) => {
    const targetMeeting = meetingForOutcome || meetingForClose;
    if (!targetMeeting) return;
    await createFollowUpTask(targetMeeting.id, title, description, dueDate);
  };

  const handlePublishToTeam = async (meetingId: string) => {
    await publishToTeam(meetingId);
  };

  const handlePrepare = (meeting: Meeting) => {
    setMeetingForPreparation(meeting);
    setShowPreparation(true);
  };

  const title = `${format(dateRange.start, 'd MMM', { locale: pt })} - ${format(dateRange.end, 'd MMM yyyy', { locale: pt })}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" onClick={goToToday}>
            Hoje
          </Button>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryFilters.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  <div className="flex items-center gap-2">
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estados</SelectItem>
              {statusOrder.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-2">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Quadro</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => {
            setSelectedMeeting(null);
            setShowCreateModal(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Reunião
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'list' && (
          <ListView 
            meetings={filteredMeetings}
            onStatusChange={updateMeetingStatus}
            onClick={handleMeetingClick}
            onRegisterOutcome={handleRegisterOutcome}
            onPublishToTeam={handlePublishToTeam}
            onPrepare={handlePrepare}
          />
        )}

        {viewMode === 'board' && (
          <BoardView
            meetingsByStatus={meetingsByStatus}
            categoryFilter={categoryFilter}
            onStatusChange={updateMeetingStatus}
            onClick={handleMeetingClick}
            onRegisterOutcome={handleRegisterOutcome}
            onPublishToTeam={handlePublishToTeam}
            onPrepare={handlePrepare}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <MeetingCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        meetingTypes={meetingTypes}
        meeting={selectedMeeting}
        onSubmit={handleCreateMeeting}
      />

      {/* Outcome Modal */}
      {meetingForOutcome && (
        <MeetingOutcomeModal
          isOpen={showOutcomeModal}
          onClose={() => {
            setShowOutcomeModal(false);
            setMeetingForOutcome(null);
          }}
          meeting={meetingForOutcome}
          onSaveOutcome={handleSaveOutcome}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* AI Close Modal for client meetings */}
      {meetingForClose && (
        <MeetingCloseModal
          isOpen={showCloseModal}
          onClose={() => {
            setShowCloseModal(false);
            setMeetingForClose(null);
          }}
          meeting={meetingForClose}
          onSaveOutcome={handleSaveOutcome}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* AI Preparation Panel */}
      {meetingForPreparation && (
        <MeetingPreparationPanel
          meeting={meetingForPreparation}
          isOpen={showPreparation}
          onClose={() => {
            setShowPreparation(false);
            setMeetingForPreparation(null);
          }}
        />
      )}
    </div>
  );
}

interface ListViewProps {
  meetings: Meeting[];
  onStatusChange: (id: string, status: MeetingStatus, reason?: string) => void;
  onClick: (meeting: Meeting) => void;
  onRegisterOutcome: (meeting: Meeting) => void;
  onPublishToTeam: (meetingId: string) => void;
  onPrepare: (meeting: Meeting) => void;
}

function ListView({ meetings, onStatusChange, onClick, onRegisterOutcome, onPublishToTeam, onPrepare }: ListViewProps) {
  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Meeting[]> = {};
    
    meetings.forEach(m => {
      const dateKey = format(new Date(m.start_time), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [meetings]);

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhuma reunião encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDate.map(([dateKey, dateMeetings]) => (
        <div key={dateKey}>
          <h3 className={cn(
            "font-semibold mb-3 flex items-center gap-2",
            isToday(new Date(dateKey)) && "text-primary"
          )}>
            {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: pt })}
            {isToday(new Date(dateKey)) && (
              <Badge variant="default">Hoje</Badge>
            )}
            <Badge variant="secondary">{dateMeetings.length}</Badge>
          </h3>
          <div className="space-y-2">
            {dateMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                compact
                onStatusChange={onStatusChange}
                onClick={onClick}
                onRegisterOutcome={onRegisterOutcome}
                onPublishToTeam={onPublishToTeam}
                onPrepare={onPrepare}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface BoardViewProps {
  meetingsByStatus: Record<MeetingStatus, Meeting[]>;
  categoryFilter: string;
  onStatusChange: (id: string, status: MeetingStatus, reason?: string) => void;
  onClick: (meeting: Meeting) => void;
  onRegisterOutcome: (meeting: Meeting) => void;
  onPublishToTeam: (meetingId: string) => void;
  onPrepare: (meeting: Meeting) => void;
}

function BoardView({ meetingsByStatus, categoryFilter, onStatusChange, onClick, onRegisterOutcome, onPublishToTeam, onPrepare }: BoardViewProps) {
  const filteredByStatus = useMemo(() => {
    const filtered: Record<MeetingStatus, Meeting[]> = {} as Record<MeetingStatus, Meeting[]>;
    
    (Object.keys(meetingsByStatus) as MeetingStatus[]).forEach(status => {
      filtered[status] = meetingsByStatus[status].filter(m => 
        categoryFilter === 'all' || m.category === categoryFilter
      );
    });

    return filtered;
  }, [meetingsByStatus, categoryFilter]);

  return (
    <div className="grid grid-cols-5 gap-4 h-full">
      {statusOrder.map(status => (
        <div key={status} className="flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
            <Badge variant="secondary">{filteredByStatus[status]?.length || 0}</Badge>
          </div>
          <div className="flex-1 space-y-2 overflow-auto">
            {filteredByStatus[status]?.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onStatusChange={onStatusChange}
                onClick={onClick}
                onRegisterOutcome={onRegisterOutcome}
                onPublishToTeam={onPublishToTeam}
                onPrepare={onPrepare}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
