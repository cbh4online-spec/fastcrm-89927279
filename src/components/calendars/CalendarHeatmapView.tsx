import { useMemo } from 'react';
import { format, startOfWeek, addDays, getHours, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay, isWithinInterval, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/hooks/useCalendars';

interface CalendarHeatmapViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  currentDate: Date;
}

// Color scale based on load intensity
const getLoadColor = (count: number, maxCount: number): string => {
  if (count === 0) return 'bg-muted/30';
  
  const intensity = count / Math.max(maxCount, 1);
  
  if (intensity <= 0.25) return 'bg-green-200 dark:bg-green-900/50';
  if (intensity <= 0.5) return 'bg-yellow-200 dark:bg-yellow-900/50';
  if (intensity <= 0.75) return 'bg-orange-200 dark:bg-orange-900/50';
  return 'bg-red-300 dark:bg-red-900/50';
};

const getLoadLabel = (count: number, totalMinutes: number): string => {
  if (count === 0) return 'Disponível';
  if (totalMinutes <= 30) return 'Leve';
  if (totalMinutes <= 60) return 'Moderado';
  if (totalMinutes <= 90) return 'Ocupado';
  return 'Muito ocupado';
};

export function CalendarHeatmapView({ events, calendars, currentDate }: CalendarHeatmapViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ 
    start: weekStart, 
    end: addDays(weekStart, 6) 
  });
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  // Calculate load for each hour slot
  const loadMatrix = useMemo(() => {
    const matrix: Record<string, { count: number; minutes: number; events: CalendarEvent[] }> = {};
    let maxCount = 0;

    weekDays.forEach(day => {
      hours.forEach(hour => {
        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(day);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        const slotEvents = events.filter(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          return (
            (eventStart < slotEnd && eventEnd > slotStart) // Overlaps with slot
          );
        });

        const totalMinutes = slotEvents.reduce((acc, event) => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          const overlapStart = eventStart > slotStart ? eventStart : slotStart;
          const overlapEnd = eventEnd < slotEnd ? eventEnd : slotEnd;
          return acc + differenceInMinutes(overlapEnd, overlapStart);
        }, 0);

        const key = `${format(day, 'yyyy-MM-dd')}-${hour}`;
        matrix[key] = { count: slotEvents.length, minutes: totalMinutes, events: slotEvents };
        maxCount = Math.max(maxCount, slotEvents.length);
      });
    });

    return { matrix, maxCount };
  }, [events, weekDays, hours]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    return weekDays.map(day => {
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        return format(eventStart, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      const totalMinutes = dayEvents.reduce((acc, event) => {
        return acc + differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
      }, 0);

      return {
        count: dayEvents.length,
        hours: Math.round(totalMinutes / 60 * 10) / 10,
      };
    });
  }, [events, weekDays]);

  // Calculate conflicts
  const conflicts = useMemo(() => {
    const conflictList: { day: Date; events: CalendarEvent[] }[] = [];

    weekDays.forEach(day => {
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        return format(eventStart, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      // Check for overlaps
      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const a = dayEvents[i];
          const b = dayEvents[j];
          const aStart = new Date(a.start_time);
          const aEnd = new Date(a.end_time);
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);

          if (aStart < bEnd && aEnd > bStart) {
            const existing = conflictList.find(c => format(c.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
            if (existing) {
              if (!existing.events.find(e => e.id === a.id)) existing.events.push(a);
              if (!existing.events.find(e => e.id === b.id)) existing.events.push(b);
            } else {
              conflictList.push({ day, events: [a, b] });
            }
          }
        }
      }
    });

    return conflictList;
  }, [events, weekDays]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Legend */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Carga horária:</span>
          <div className="flex items-center gap-2">
            {[
              { color: 'bg-muted/50', label: 'Livre' },
              { color: 'bg-green-200 dark:bg-green-900/50', label: 'Leve' },
              { color: 'bg-yellow-200 dark:bg-yellow-900/50', label: 'Moderado' },
              { color: 'bg-orange-200 dark:bg-orange-900/50', label: 'Ocupado' },
              { color: 'bg-red-300 dark:bg-red-900/50', label: 'Muito ocupado' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={cn("w-4 h-4 rounded", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-center gap-2 text-destructive">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">{conflicts.length} conflito(s) detectado(s)</span>
          </div>
        )}
      </div>

      {/* Heatmap grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-2">
            <div /> {/* Empty corner */}
            {weekDays.map((day, i) => (
              <div key={day.toISOString()} className="text-center">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: pt })}
                </div>
                <div className="text-lg font-semibold">{format(day, 'd')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {dailyTotals[i].count} eventos • {dailyTotals[i].hours}h
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1">
            {hours.map(hour => (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div className="text-xs text-muted-foreground text-right pr-2 py-2">
                  {String(hour).padStart(2, '0')}:00
                </div>
                
                {/* Day cells */}
                {weekDays.map(day => {
                  const key = `${format(day, 'yyyy-MM-dd')}-${hour}`;
                  const slot = loadMatrix.matrix[key] || { count: 0, minutes: 0, events: [] };
                  const hasConflict = conflicts.some(c => 
                    format(c.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
                    slot.events.some(e => c.events.find(ce => ce.id === e.id))
                  );

                  return (
                    <div
                      key={key}
                      className={cn(
                        "h-10 rounded-sm transition-colors relative group cursor-pointer",
                        getLoadColor(slot.count, loadMatrix.maxCount),
                        hasConflict && "ring-2 ring-destructive ring-inset"
                      )}
                      title={`${slot.count} evento(s) - ${slot.minutes} min ocupados`}
                    >
                      {slot.count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium opacity-70">
                            {slot.count}
                          </span>
                        </div>
                      )}
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-popover text-popover-foreground text-xs rounded-lg shadow-lg p-2 whitespace-nowrap border">
                          <div className="font-medium mb-1">
                            {format(day, 'EEE d', { locale: pt })} às {hour}:00
                          </div>
                          <div className="text-muted-foreground">
                            {getLoadLabel(slot.count, slot.minutes)}
                          </div>
                          {slot.events.length > 0 && (
                            <div className="mt-1 pt-1 border-t space-y-0.5">
                              {slot.events.slice(0, 3).map(e => (
                                <div key={e.id} className="truncate max-w-[150px]">
                                  {e.title}
                                </div>
                              ))}
                              {slot.events.length > 3 && (
                                <div className="text-muted-foreground">
                                  +{slot.events.length - 3} mais
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conflicts summary */}
      {conflicts.length > 0 && (
        <div className="border-t p-4 bg-destructive/5">
          <h4 className="font-medium text-destructive mb-2">Conflitos de horário</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-20 text-muted-foreground">
                  {format(conflict.day, 'EEE d/MM', { locale: pt })}
                </div>
                <div className="flex-1">
                  {conflict.events.map((e, j) => (
                    <span key={e.id}>
                      {j > 0 && ' ⚡ '}
                      <span className="font-medium">{e.title}</span>
                      <span className="text-muted-foreground">
                        {' '}({format(new Date(e.start_time), 'HH:mm')}-{format(new Date(e.end_time), 'HH:mm')})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
