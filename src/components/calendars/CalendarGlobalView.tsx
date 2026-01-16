import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  CalendarDays,
  List,
  LayoutGrid,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './CalendarView';
import { CalendarListView, type CalendarFilters } from './CalendarListView';
import { CalendarHeatmapView } from './CalendarHeatmapView';
import { CalendarGlobalFilters } from './CalendarGlobalFilters';
import type { CalendarEvent, Calendar, CalendarGroup } from '@/hooks/useCalendars';

type GlobalViewMode = 'agenda' | 'list' | 'heatmap';

interface CalendarGlobalViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  groups: CalendarGroup[];
  selectedCalendarIds: string[];
  onCreateEvent: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarGlobalView({
  events,
  calendars,
  groups,
  selectedCalendarIds,
  onCreateEvent,
  onEventClick,
}: CalendarGlobalViewProps) {
  const [globalViewMode, setGlobalViewMode] = useState<GlobalViewMode>('agenda');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFilters>({
    search: '',
    calendarType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    calendarIds: [],
  });

  const navigate = (direction: 'prev' | 'next') => {
    if (globalViewMode === 'heatmap') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Filter events based on selected calendars
  const filteredEvents = useMemo(() => {
    const calendarFilter = filters.calendarIds.length > 0 
      ? filters.calendarIds 
      : selectedCalendarIds;
    return events.filter(e => calendarFilter.includes(e.calendar_id));
  }, [events, selectedCalendarIds, filters.calendarIds]);

  const title = useMemo(() => {
    if (globalViewMode === 'heatmap') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return `${format(start, 'd MMM', { locale: pt })} - ${format(end, 'd MMM yyyy', { locale: pt })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: pt });
  }, [currentDate, globalViewMode]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Global header */}
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
          <h2 className="text-lg font-semibold capitalize">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode switcher */}
          <Tabs 
            value={globalViewMode} 
            onValueChange={(v) => setGlobalViewMode(v as GlobalViewMode)}
          >
            <TabsList>
              <TabsTrigger value="agenda" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <Flame className="h-4 w-4" />
                <span className="hidden sm:inline">Carga</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => onCreateEvent(currentDate)}>
            <Plus className="h-4 w-4 mr-1" />
            Evento
          </Button>
        </div>
      </div>

      {/* Filters - always visible in list mode, collapsible in others */}
      {(globalViewMode === 'list' || globalViewMode === 'heatmap') && (
        <CalendarGlobalFilters
          filters={filters}
          onFiltersChange={setFilters}
          calendars={calendars}
          groups={groups}
        />
      )}

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {globalViewMode === 'agenda' && (
          <CalendarView
            events={filteredEvents}
            calendars={calendars}
            selectedCalendarIds={selectedCalendarIds}
            onCreateEvent={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}

        {globalViewMode === 'list' && (
          <CalendarListView
            events={filteredEvents}
            calendars={calendars}
            filters={filters}
            onEventClick={onEventClick}
          />
        )}

        {globalViewMode === 'heatmap' && (
          <CalendarHeatmapView
            events={filteredEvents}
            calendars={calendars}
            currentDate={currentDate}
          />
        )}
      </div>
    </div>
  );
}
