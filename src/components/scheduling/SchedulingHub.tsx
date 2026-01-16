import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { 
  CalendarDays, 
  Clock, 
  Briefcase, 
  CalendarClock,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Calendar components
import { useCalendars, type Calendar, type CalendarEvent, type CreateCalendarData, type CreateEventData } from '@/hooks/useCalendars';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarSidebar } from '@/components/calendars/CalendarSidebar';
import { CalendarGlobalView } from '@/components/calendars/CalendarGlobalView';
import { CalendarCreateModal } from '@/components/calendars/CalendarCreateModal';
import { CalendarEventModal } from '@/components/calendars/CalendarEventModal';

// Meetings components
import { MeetingsDashboard } from '@/components/meetings/MeetingsDashboard';

// Services components  
import { ServicesDashboard } from '@/components/services/ServicesDashboard';

// Availability components
import { AvailabilityDashboard } from '@/components/availability/AvailabilityDashboard';

import { Loader2 } from 'lucide-react';

type TabValue = 'calendar' | 'meetings' | 'services' | 'availability';

const tabs: { value: TabValue; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'calendar', label: 'Agenda', icon: CalendarDays, description: 'Vista global de eventos' },
  { value: 'meetings', label: 'Reuniões', icon: Clock, description: 'Gestão de reuniões' },
  { value: 'services', label: 'Serviços', icon: Briefcase, description: 'Tipos de agendamento' },
  { value: 'availability', label: 'Disponibilidade', icon: CalendarClock, description: 'Horários de trabalho' },
];

export function SchedulingHub() {
  const [activeTab, setActiveTab] = useState<TabValue>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState<Date>(new Date());

  const {
    calendars,
    groups,
    selectedCalendarIds,
    isLoading: calendarsLoading,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    toggleCalendarSelection,
    selectAllCalendars,
    deselectAllCalendars,
  } = useCalendars();

  // Calculate date range for events (current month + buffer)
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(subMonths(currentDate, 1));
    const monthEnd = endOfMonth(addMonths(currentDate, 1));
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    };
  }, [currentDate]);

  const {
    events,
    isLoading: eventsLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents(selectedCalendarIds, dateRange);

  const handleCreateCalendar = () => {
    setEditingCalendar(null);
    setShowCalendarModal(true);
  };

  const handleEditCalendar = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setShowCalendarModal(true);
  };

  const handleSubmitCalendar = async (data: CreateCalendarData) => {
    if (editingCalendar) {
      await updateCalendar(editingCalendar.id, data);
    } else {
      await createCalendar(data);
    }
  };

  const handleCreateEvent = (date: Date) => {
    setEditingEvent(null);
    setDefaultEventDate(date);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleSubmitEvent = async (data: CreateEventData) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  // Stats for badges
  const stats = useMemo(() => ({
    events: events.length,
    calendars: calendars.length,
  }), [events, calendars]);

  if (calendarsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with glassmorphism effect */}
      <div className="relative px-6 py-4 border-b bg-background/80 backdrop-blur-xl">
        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1.5 group">
              <LayoutDashboard className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span>Dashboard</span>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-foreground font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Centro de Agendamento
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">{stats.calendars} calendários</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 border border-accent">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{stats.events} eventos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Futuristic Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b bg-muted/30 backdrop-blur-sm">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto bg-background/50 backdrop-blur-sm p-1.5 rounded-xl border shadow-lg shadow-primary/5">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative flex items-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-300",
                  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80",
                  "data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25",
                  "hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="flex-1 flex overflow-hidden mt-0 p-0">
          <CalendarSidebar
            calendars={calendars}
            groups={groups}
            selectedCalendarIds={selectedCalendarIds}
            onToggleCalendar={toggleCalendarSelection}
            onSelectAll={selectAllCalendars}
            onDeselectAll={deselectAllCalendars}
            onCreateCalendar={handleCreateCalendar}
            onEditCalendar={handleEditCalendar}
          />
          <CalendarGlobalView
            events={events}
            calendars={calendars}
            groups={groups}
            selectedCalendarIds={selectedCalendarIds}
            onCreateEvent={handleCreateEvent}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="flex-1 overflow-auto mt-0">
          <MeetingsTabContent />
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="flex-1 overflow-auto mt-0">
          <ServicesTabContent />
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="flex-1 overflow-auto mt-0">
          <AvailabilityTabContent />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CalendarCreateModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        groups={groups}
        calendar={editingCalendar}
        onSubmit={handleSubmitCalendar}
        onDelete={deleteCalendar}
      />

      <CalendarEventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        calendars={calendars}
        event={editingEvent}
        defaultDate={defaultEventDate}
        onSubmit={handleSubmitEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

// Wrapper components to embed the existing dashboards without their headers
function MeetingsTabContent() {
  return (
    <div className="h-full [&>div>div:first-child]:hidden">
      <MeetingsDashboard />
    </div>
  );
}

function ServicesTabContent() {
  return (
    <div className="h-full [&>div>div:first-child]:hidden">
      <ServicesDashboard />
    </div>
  );
}

function AvailabilityTabContent() {
  return (
    <div className="h-full [&>div>div:first-child]:hidden">
      <AvailabilityDashboard />
    </div>
  );
}
