import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { 
  CalendarDays, 
  Clock, 
  Briefcase, 
  CalendarClock,
  Plus,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

// Common components
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, FilterGroup } from '@/components/common/FilterSidebar';

import { Loader2 } from 'lucide-react';

type TabValue = 'calendar' | 'meetings' | 'services' | 'availability';

const pageTabs = [
  { id: 'calendar', label: 'Agenda', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'meetings', label: 'Reuniões', icon: <Clock className="h-4 w-4" /> },
  { id: 'services', label: 'Serviços', icon: <Briefcase className="h-4 w-4" /> },
  { id: 'availability', label: 'Disponibilidade', icon: <CalendarClock className="h-4 w-4" /> },
];

const sortOptions = [
  { value: 'date_asc', label: 'Data (próximos)' },
  { value: 'date_desc', label: 'Data (recentes)' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
];

const filterGroups: FilterGroup[] = [
  {
    id: 'type',
    label: 'Tipo de Evento',
    icon: <CalendarDays className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: 'type_meeting', label: 'Reuniões', icon: <Clock className="h-4 w-4" /> },
      { id: 'type_task', label: 'Tarefas' },
      { id: 'type_reminder', label: 'Lembretes' },
      { id: 'type_block', label: 'Bloqueios' },
    ],
  },
  {
    id: 'status',
    label: 'Estado',
    icon: <Clock className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: 'status_confirmed', label: 'Confirmado' },
      { id: 'status_pending', label: 'Pendente' },
      { id: 'status_cancelled', label: 'Cancelado' },
    ],
  },
  {
    id: 'timing',
    label: 'Período',
    icon: <CalendarClock className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: 'timing_today', label: 'Hoje' },
      { id: 'timing_week', label: 'Esta semana' },
      { id: 'timing_month', label: 'Este mês' },
    ],
  },
];

export function SchedulingHub() {
  const [activeTab, setActiveTab] = useState<TabValue>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState<Date>(new Date());

  // New state for reorganized UI
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('date_asc');

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

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
  };

  // Stats for badges
  const stats = useMemo(() => ({
    events: events.length,
    calendars: calendars.length,
  }), [events, calendars]);

  const filtersActive = !!activeFilterId;

  if (calendarsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getActionForTab = () => {
    switch (activeTab) {
      case 'calendar':
        return {
          label: 'Novo Evento',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => handleCreateEvent(new Date()),
        };
      case 'meetings':
        return {
          label: 'Nova Reunião',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {},
        };
      case 'services':
        return {
          label: 'Novo Serviço',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {},
        };
      case 'availability':
        return {
          label: 'Nova Disponibilidade',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {},
        };
      default:
        return undefined;
    }
  };

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar - Only shown for calendar tab */}
      {activeTab === 'calendar' && (
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={() => setActiveFilterId(undefined)}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Centro de Agendamento"
          count={stats.events}
          description={`${stats.calendars} calendários ativos`}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabValue)}
          actions={getActionForTab() ? [getActionForTab()!] : []}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eventos</p>
                <p className="text-2xl font-bold">{stats.events}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-primary/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calendários</p>
                <p className="text-2xl font-bold text-blue-600">{stats.calendars}</p>
              </div>
              <CalendarClock className="h-8 w-8 text-blue-500/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-green-600">
                  {events.filter(e => {
                    const eventDate = new Date(e.start_time);
                    const today = new Date();
                    return eventDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-purple-600">
                  {events.filter(e => {
                    const eventDate = new Date(e.start_time);
                    const now = new Date();
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return eventDate >= now && eventDate <= weekEnd;
                  }).length}
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-purple-500/50" />
            </div>
          </Card>
        </div>

        {/* Toolbar - Only shown for calendar tab */}
        {activeTab === 'calendar' && (
          <Toolbar
            searchValue={searchValue}
            searchPlaceholder="Pesquisar eventos..."
            onSearchChange={setSearchValue}
            showFilters={true}
            filtersActive={filtersActive}
            onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
            onClearFilters={() => setActiveFilterId(undefined)}
            sortOptions={sortOptions}
            sortValue={sortValue}
            onSortChange={setSortValue}
            leftActions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                className="gap-2"
              >
                {showFilterSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            }
            rightActions={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCreateCalendar} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Calendários
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            }
          />
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'calendar' && (
            <div className="flex h-full gap-4">
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
              <div className="flex-1">
                <CalendarGlobalView
                  events={events}
                  calendars={calendars}
                  groups={groups}
                  selectedCalendarIds={selectedCalendarIds}
                  onCreateEvent={handleCreateEvent}
                  onEventClick={handleEventClick}
                />
              </div>
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="h-full overflow-auto">
              <MeetingsDashboard />
            </div>
          )}

          {activeTab === 'services' && (
            <div className="h-full overflow-auto">
              <ServicesDashboard />
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="h-full overflow-auto">
              <AvailabilityDashboard />
            </div>
          )}
        </div>
      </div>

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
