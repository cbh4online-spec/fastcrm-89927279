import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { useCalendars, type Calendar, type CalendarEvent, type CreateCalendarData, type CreateEventData } from '@/hooks/useCalendars';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCommunityEventsForCalendar, COMMUNITY_CALENDAR, CATEGORY_COLORS } from '@/hooks/useCommunityEventsForCalendar';
import { CalendarSidebar } from '@/components/calendars/CalendarSidebar';
import { CalendarGlobalView } from '@/components/calendars/CalendarGlobalView';
import { CalendarCreateModal } from '@/components/calendars/CalendarCreateModal';
import { CalendarEventModal } from '@/components/calendars/CalendarEventModal';
import { Loader2, LayoutDashboard, Clock, Briefcase, CalendarClock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COMMUNITY_CALENDAR_ID = 'community-events';

export default function CalendarsPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState<Date>(new Date());
  const [showCommunityEvents, setShowCommunityEvents] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(CATEGORY_COLORS));

  const handleToggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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

  const { events: communityEvents } = useCommunityEventsForCalendar(dateRange);

  // Merge events
  const mergedEvents = useMemo(() => {
    if (showCommunityEvents) {
      const filtered = communityEvents.filter(evt => {
        const color = (evt.metadata as any)?._categoryColor;
        // Find the category key by its color
        const categoryKey = Object.entries(CATEGORY_COLORS).find(([, c]) => c === color)?.[0];
        return categoryKey ? selectedCategories.includes(categoryKey) : true;
      });
      return [...events, ...filtered];
    }
    return events;
  }, [events, communityEvents, showCommunityEvents, selectedCategories]);

  // Merge calendars for sidebar
  const allCalendars = useMemo(() => {
    return [...calendars, COMMUNITY_CALENDAR];
  }, [calendars]);

  // Selected IDs including community
  const allSelectedIds = useMemo(() => {
    return showCommunityEvents
      ? [...selectedCalendarIds, COMMUNITY_CALENDAR_ID]
      : selectedCalendarIds;
  }, [selectedCalendarIds, showCommunityEvents]);

  const handleToggleCalendar = (id: string) => {
    if (id === COMMUNITY_CALENDAR_ID) {
      setShowCommunityEvents(prev => !prev);
    } else {
      toggleCalendarSelection(id);
    }
  };

  const handleCreateCalendar = () => {
    setEditingCalendar(null);
    setShowCalendarModal(true);
  };

  const handleEditCalendar = (calendar: Calendar) => {
    if (calendar.id === COMMUNITY_CALENDAR_ID) return;
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
    // Community event → navigate to event detail
    if (event.calendar_id === COMMUNITY_CALENDAR_ID) {
      const realId = (event.metadata as any)?._communityEventId || event.id.replace('community-', '');
      navigate(`/dashboard/events/${realId}`);
      return;
    }
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
        calendars={allCalendars}
        groups={groups}
        selectedCalendarIds={allSelectedIds}
        onToggleCalendar={handleToggleCalendar}
        onSelectAll={selectAllCalendars}
        onDeselectAll={deselectAllCalendars}
        onCreateCalendar={handleCreateCalendar}
        onEditCalendar={handleEditCalendar}
        virtualCalendarIds={[COMMUNITY_CALENDAR_ID]}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
      />

      <CalendarGlobalView
        events={mergedEvents}
        calendars={allCalendars}
        groups={groups}
        selectedCalendarIds={allSelectedIds}
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
