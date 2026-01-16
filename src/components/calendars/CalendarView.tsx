import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/hooks/useCalendars';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  selectedCalendarIds: string[];
  onCreateEvent: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarView({
  events,
  calendars,
  selectedCalendarIds,
  onCreateEvent,
  onEventClick,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getCalendarColor = (calendarId: string) => {
    return calendars.find(c => c.id === calendarId)?.color || '#3B82F6';
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => selectedCalendarIds.includes(e.calendar_id));
  }, [events, selectedCalendarIds]);

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, date);
    });
  };

  const title = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: pt });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: pt })} - ${format(end, 'd MMM yyyy', { locale: pt })}`;
    } else {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt });
    }
  }, [currentDate, viewMode]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
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

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>
          <Button onClick={() => onCreateEvent(currentDate)}>
            <Plus className="h-4 w-4 mr-1" />
            Evento
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            getCalendarColor={getCalendarColor}
            onDayClick={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            getCalendarColor={getCalendarColor}
            onTimeClick={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={getEventsForDay(currentDate)}
            getCalendarColor={getCalendarColor}
            onTimeClick={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getCalendarColor: (id: string) => string;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function MonthView({ currentDate, events, getCalendarColor, onDayClick, onEventClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), date));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(day => (
          <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r p-1 min-h-[100px] cursor-pointer hover:bg-accent/50 transition-colors",
                !isCurrentMonth && "bg-muted/30"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className={cn(
                "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground",
                !isCurrentMonth && "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{ 
                      backgroundColor: getCalendarColor(event.calendar_id),
                      color: 'white'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getCalendarColor: (id: string) => string;
  onTimeClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function WeekView({ currentDate, events, getCalendarColor, onTimeClick, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, date) && eventStart.getHours() === hour;
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
          <div className="border-r" />
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 border-r",
                isToday(day) && "bg-primary/10"
              )}
            >
              <div className="text-xs text-muted-foreground">
                {format(day, 'EEE', { locale: pt })}
              </div>
              <div className={cn(
                "text-lg font-semibold",
                isToday(day) && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map(hour => (
            <div key={hour} className="contents">
              <div className="border-r border-b h-12 text-xs text-muted-foreground text-right pr-2 pt-1">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map(day => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-r border-b h-12 p-0.5 hover:bg-accent/30 cursor-pointer relative"
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour, 0, 0, 0);
                      onTimeClick(clickDate);
                    }}
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="absolute inset-x-0.5 text-xs px-1 py-0.5 rounded truncate cursor-pointer z-10"
                        style={{ 
                          backgroundColor: getCalendarColor(event.calendar_id),
                          color: 'white',
                          top: '2px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        {format(new Date(event.start_time), 'HH:mm')} {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getCalendarColor: (id: string) => string;
  onTimeClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function DayView({ currentDate, events, getCalendarColor, onTimeClick, onEventClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart.getHours() === hour;
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-[60px_1fr]">
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="contents">
              <div className="border-r border-b h-16 text-xs text-muted-foreground text-right pr-2 pt-1">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div
                className="border-b h-16 p-1 hover:bg-accent/30 cursor-pointer relative"
                onClick={() => {
                  const clickDate = new Date(currentDate);
                  clickDate.setHours(hour, 0, 0, 0);
                  onTimeClick(clickDate);
                }}
              >
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className="text-sm px-2 py-1 rounded cursor-pointer hover:opacity-80 mb-1"
                    style={{ 
                      backgroundColor: getCalendarColor(event.calendar_id),
                      color: 'white'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    <span className="font-medium">{format(new Date(event.start_time), 'HH:mm')}</span>
                    {' '}{event.title}
                    {event.location && (
                      <span className="opacity-80 ml-2">📍 {event.location}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
