import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { useCalendars, type Calendar, type CalendarEvent, type CreateCalendarData, type CreateEventData } from '@/hooks/useCalendars';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarSidebar } from '@/components/calendars/CalendarSidebar';
import { CalendarGlobalView } from '@/components/calendars/CalendarGlobalView';
import { CalendarCreateModal } from '@/components/calendars/CalendarCreateModal';
import { CalendarEventModal } from '@/components/calendars/CalendarEventModal';
import { Loader2, LayoutDashboard, Clock, Briefcase, CalendarClock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarsPage() {
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

  if (calendarsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Quick Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Calendários</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/meetings" className="gap-2">
              <Clock className="h-4 w-4" />
              Reuniões
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Serviços
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/availability" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Disponibilidade
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
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
    </div>
  );
}
