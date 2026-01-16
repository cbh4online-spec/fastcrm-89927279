import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  CalendarDays,
  List,
  Flame,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarView } from './CalendarView';
import { CalendarListView, type CalendarFilters } from './CalendarListView';
import { CalendarHeatmapView } from './CalendarHeatmapView';
import { CalendarGlobalFilters } from './CalendarGlobalFilters';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar, CalendarGroup } from '@/hooks/useCalendars';

type GlobalViewMode = 'agenda' | 'list' | 'heatmap';
type CalendarViewMode = 'day' | 'week' | 'month';

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
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
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
    } else if (globalViewMode === 'agenda') {
      if (calendarViewMode === 'month') {
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
      } else if (calendarViewMode === 'week') {
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
      } else {
        setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
      }
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
    if (globalViewMode === 'agenda') {
      if (calendarViewMode === 'month') {
        return format(currentDate, 'MMMM yyyy', { locale: pt });
      } else if (calendarViewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(start, 'd MMM', { locale: pt })} - ${format(end, 'd MMM yyyy', { locale: pt })}`;
      } else {
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt });
      }
    }
    return format(currentDate, 'MMMM yyyy', { locale: pt });
  }, [currentDate, globalViewMode, calendarViewMode]);

  const viewModeLabels: Record<CalendarViewMode, string> = {
    day: 'Dia',
    week: 'Semana',
    month: 'Mês'
  };

  const globalModeConfig = [
    { key: 'agenda' as GlobalViewMode, icon: CalendarDays, label: 'Agenda' },
    { key: 'list' as GlobalViewMode, icon: List, label: 'Lista' },
    { key: 'heatmap' as GlobalViewMode, icon: Flame, label: 'Carga' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Modern Unified Header */}
      <div className="relative px-6 py-4 border-b border-border/50 bg-gradient-to-r from-card/80 via-card/90 to-card/80 backdrop-blur-xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="relative flex items-center justify-between gap-4">
          {/* Left: Navigation + Title */}
          <div className="flex items-center gap-4">
            {/* Navigation buttons */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('prev')}
                className="h-9 w-9 rounded-lg hover:bg-background/80 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('next')}
                className="h-9 w-9 rounded-lg hover:bg-background/80 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Today button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Hoje
            </Button>

            {/* Period title */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {title}
              </h2>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Calendar view mode toggle (only in agenda mode) */}
            {globalViewMode === 'agenda' && (
              <div className="flex items-center bg-muted/50 rounded-xl p-1">
                {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalendarViewMode(mode)}
                    className={cn(
                      "rounded-lg px-4 h-9 transition-all duration-200",
                      calendarViewMode === mode 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {viewModeLabels[mode]}
                  </Button>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="h-8 w-px bg-border/50" />

            {/* Global view mode toggle */}
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              {globalModeConfig.map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => setGlobalViewMode(key)}
                  className={cn(
                    "rounded-lg px-4 h-9 gap-2 transition-all duration-200",
                    globalViewMode === key 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              ))}
            </div>

            {/* Create event button */}
            <Button 
              onClick={() => onCreateEvent(currentDate)}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Evento
            </Button>
          </div>
        </div>
      </div>

      {/* Filters - visible in list and heatmap modes */}
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
            currentDate={currentDate}
            viewMode={calendarViewMode}
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
