import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/hooks/useCalendars';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { EventTooltipContent } from './EventTooltipContent';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  selectedCalendarIds: string[];
  currentDate: Date;
  viewMode: ViewMode;
  onCreateEvent: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarView({
  events,
  calendars,
  selectedCalendarIds,
  currentDate,
  viewMode,
  onCreateEvent,
  onEventClick,
}: CalendarViewProps) {
  const getCalendarColor = (calendarId: string, event?: CalendarEvent) => {
    const categoryColor = (event?.metadata as any)?._categoryColor;
    if (categoryColor) return categoryColor;
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

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
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
    </TooltipProvider>
  );
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getCalendarColor: (id: string, event?: CalendarEvent) => string;
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
    <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
      {/* Week day headers */}
      <div className="grid grid-cols-7 bg-muted/30 backdrop-blur-sm">
        {weekDays.map(day => (
          <div key={day} className="text-center py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-border/30 p-2 min-h-[110px] cursor-pointer",
                "transition-all duration-200 ease-out",
                "hover:bg-accent/40 hover:scale-[1.01] hover:shadow-lg hover:z-10",
                !isCurrentMonth && "bg-muted/20 opacity-60",
                today && "bg-primary/5"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className={cn(
                "text-sm font-semibold mb-2 w-8 h-8 flex items-center justify-center rounded-full",
                "transition-all duration-200",
                today && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
                !isCurrentMonth && "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  const color = getCalendarColor(event.calendar_id, event);
                  return (
                    <Tooltip key={event.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="text-xs px-2 py-1 rounded-lg truncate cursor-pointer transition-all duration-150 hover:scale-105 hover:shadow-md"
                          style={{ 
                            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                            color: 'white',
                            boxShadow: `0 2px 8px ${color}40`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start">
                        <EventTooltipContent metadata={event.metadata as Record<string, any>} title={event.title} />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-2 font-medium">
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
  getCalendarColor: (id: string, event?: CalendarEvent) => string;
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
    <div className="h-full overflow-auto rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-muted/50 backdrop-blur-xl z-10 border-b border-border/50">
          <div className="border-r border-border/30" />
          {days.map(day => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "text-center py-3 border-r border-border/30 transition-colors duration-200",
                  today && "bg-primary/10"
                )}
              >
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {format(day, 'EEE', { locale: pt })}
                </div>
                <div className={cn(
                  "text-xl font-bold mt-1 w-10 h-10 flex items-center justify-center mx-auto rounded-full transition-all duration-200",
                  today && "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map(hour => (
            <div key={hour} className="contents">
              <div className="border-r border-b border-border/30 h-14 text-xs text-muted-foreground text-right pr-3 pt-1 font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map(day => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-r border-b border-border/30 h-14 p-1 hover:bg-accent/30 cursor-pointer relative transition-colors duration-150"
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour, 0, 0, 0);
                      onTimeClick(clickDate);
                    }}
                  >
                    {hourEvents.map(event => {
                      const color = getCalendarColor(event.calendar_id, event);
                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute inset-x-1 text-xs px-2 py-1 rounded-lg truncate cursor-pointer z-10 transition-all duration-150 hover:scale-105"
                              style={{ 
                                background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                                color: 'white',
                                top: '4px',
                                boxShadow: `0 2px 8px ${color}40`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event);
                              }}
                            >
                              {format(new Date(event.start_time), 'HH:mm')} {event.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start">
                            <EventTooltipContent metadata={event.metadata as Record<string, any>} title={event.title} />
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
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
  getCalendarColor: (id: string, event?: CalendarEvent) => string;
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
    <div className="h-full overflow-auto rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
      <div className="grid grid-cols-[80px_1fr]">
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="contents">
              <div className="border-r border-b border-border/30 h-20 text-sm text-muted-foreground text-right pr-4 pt-2 font-medium bg-muted/20">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div
                className="border-b border-border/30 h-20 p-2 hover:bg-accent/30 cursor-pointer relative transition-colors duration-150"
                onClick={() => {
                  const clickDate = new Date(currentDate);
                  clickDate.setHours(hour, 0, 0, 0);
                  onTimeClick(clickDate);
                }}
              >
                {hourEvents.map(event => {
                  const color = getCalendarColor(event.calendar_id, event);
                  return (
                    <Tooltip key={event.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="text-sm px-3 py-2 rounded-xl cursor-pointer mb-1 transition-all duration-150 hover:scale-[1.02] hover:shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                            color: 'white',
                            boxShadow: `0 4px 12px ${color}40`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <span className="font-bold">{format(new Date(event.start_time), 'HH:mm')}</span>
                          <span className="mx-2">•</span>
                          <span>{event.title}</span>
                          {event.location && (
                            <span className="opacity-80 ml-3 text-xs">📍 {event.location}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start">
                        <EventTooltipContent metadata={event.metadata as Record<string, any>} title={event.title} />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
