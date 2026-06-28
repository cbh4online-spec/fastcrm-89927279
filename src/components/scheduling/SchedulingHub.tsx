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
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

// Booking pages
import { BookingPagesTab } from '@/components/scheduling/BookingPagesTab';

// New premium components
import { SchedulingAnalytics } from '@/components/scheduling/SchedulingAnalytics';
import { EmbedWidgetGenerator } from '@/components/scheduling/EmbedWidgetGenerator';
import { OccupancyMapView } from '@/components/scheduling/OccupancyMapView';

// Common components
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, FilterGroup } from '@/components/common/FilterSidebar';
import { IXEntityTabs, type IXTabDef } from '@/components/entity/ix/IXEntityTabs';

import { Loader2 } from 'lucide-react';


type TabValue = 'calendar' | 'meetings' | 'services' | 'availability' | 'booking-links' | 'analytics' | 'embed' | 'occupancy';

const pageTabs: IXTabDef[] = [
  { id: 'calendar', label: 'Agenda' },
  { id: 'meetings', label: 'Reuniões' },
  { id: 'services', label: 'Serviços' },
  { id: 'availability', label: 'Disponibilidade' },
  { id: 'booking-links', label: 'Links' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'embed', label: 'Embed' },
  { id: 'occupancy', label: 'Ocupação' },
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* IX Header */}
        <header className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Centro de Agendamento</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.calendars} calendários ativos · {stats.events} eventos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getActionForTab() && (
                <Button onClick={getActionForTab()!.onClick} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {getActionForTab()!.label}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleCreateCalendar}>
                    <Settings className="h-4 w-4 mr-2" /> Gerir calendários
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowFilterSidebar(!showFilterSidebar)}>
                    {showFilterSidebar ? <PanelLeftClose className="h-4 w-4 mr-2" /> : <PanelLeft className="h-4 w-4 mr-2" />}
                    {showFilterSidebar ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* IX Tabs */}
        <IXEntityTabs
          tabs={pageTabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TabValue)}
          className="px-6"
        />

        {/* KPI Tiles - neutral */}
        <div className="px-6 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Eventos', value: stats.events, Icon: CalendarDays },
            { label: 'Calendários', value: stats.calendars, Icon: CalendarClock },
            {
              label: 'Hoje',
              value: events.filter(e => {
                const d = new Date(e.start_time);
                return d.toDateString() === new Date().toDateString();
              }).length,
              Icon: Clock,
            },
            {
              label: 'Esta Semana',
              value: events.filter(e => {
                const d = new Date(e.start_time);
                const now = new Date();
                const end = new Date(now);
                end.setDate(end.getDate() + 7);
                return d >= now && d <= end;
              }).length,
              Icon: Briefcase,
            },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pt-4 flex-1 flex flex-col min-h-0">


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

          {activeTab === 'booking-links' && (
            <div className="h-full overflow-auto">
              <BookingPagesTab calendars={calendars} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="h-full overflow-auto">
              <SchedulingAnalytics />
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="h-full overflow-auto">
              <EmbedWidgetGenerator />
            </div>
          )}

          {activeTab === 'occupancy' && (
            <div className="h-full overflow-auto">
              <OccupancyMapView
                calendars={calendars}
                events={events}
                isLoading={eventsLoading}
              />
            </div>
          )}
        </div>
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
