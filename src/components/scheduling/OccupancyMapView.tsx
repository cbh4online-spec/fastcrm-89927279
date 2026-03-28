import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, getHours, getMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Calendar, CalendarEvent } from '@/hooks/useCalendars';
import { Loader2 } from 'lucide-react';

interface OccupancyMapViewProps {
  calendars: Calendar[];
  events: CalendarEvent[];
  isLoading?: boolean;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h to 19h

export function OccupancyMapView({ calendars, events, isLoading }: OccupancyMapViewProps) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Mon-Fri

  // Calculate occupancy per calendar per day
  const occupancyGrid = useMemo(() => {
    return calendars.map(cal => {
      const calEvents = events.filter(e => e.calendar_id === cal.id);
      const days = weekDays.map(day => {
        const dayEvents = calEvents.filter(e => isSameDay(new Date(e.start_time), day));
        const totalMinutes = dayEvents.reduce((sum, e) => {
          const start = new Date(e.start_time);
          const end = new Date(e.end_time);
          return sum + (end.getTime() - start.getTime()) / 60000;
        }, 0);
        const availableMinutes = 10 * 60; // 8h to 18h = 10 hours
        const occupancy = Math.min(totalMinutes / availableMinutes, 1);
        return {
          day,
          events: dayEvents,
          totalMinutes,
          occupancy,
          count: dayEvents.length,
        };
      });

      // Total week occupancy
      const weekTotalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
      const weekOccupancy = weekTotalMinutes / (5 * 10 * 60);

      return { calendar: cal, days, weekOccupancy };
    });
  }, [calendars, events, weekDays]);

  // Event blocks for timeline view
  const getEventBlocks = (calEvents: CalendarEvent[], day: Date) => {
    return calEvents
      .filter(e => isSameDay(new Date(e.start_time), day))
      .map(e => {
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        const startHour = getHours(start) + getMinutes(start) / 60;
        const endHour = getHours(end) + getMinutes(end) / 60;
        const top = ((startHour - 7) / 13) * 100;
        const height = ((endHour - startHour) / 13) * 100;
        return { ...e, top: Math.max(top, 0), height: Math.min(height, 100 - top) };
      });
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy === 0) return 'bg-muted';
    if (occupancy < 0.3) return 'bg-green-500/20';
    if (occupancy < 0.6) return 'bg-yellow-500/25';
    if (occupancy < 0.8) return 'bg-orange-500/30';
    return 'bg-red-500/30';
  };

  const getOccupancyLabel = (occupancy: number) => {
    if (occupancy === 0) return 'Livre';
    if (occupancy < 0.3) return 'Baixa';
    if (occupancy < 0.6) return 'Média';
    if (occupancy < 0.8) return 'Alta';
    return 'Lotado';
  };

  const getOccupancyBadgeVariant = (occupancy: number): 'default' | 'secondary' | 'destructive' => {
    if (occupancy < 0.5) return 'secondary';
    if (occupancy < 0.8) return 'default';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <Card className="p-8 text-center m-4">
        <p className="text-muted-foreground">Nenhum calendário disponível</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold">Mapa de Ocupação</h3>
        <p className="text-sm text-muted-foreground">
          Visão semanal da carga de todos os calendários — {format(weekDays[0], "d MMM", { locale: pt })} a {format(weekDays[4], "d MMM yyyy", { locale: pt })}
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Livre', cls: 'bg-muted' },
          { label: 'Baixa', cls: 'bg-green-500/20' },
          { label: 'Média', cls: 'bg-yellow-500/25' },
          { label: 'Alta', cls: 'bg-orange-500/30' },
          { label: 'Lotado', cls: 'bg-red-500/30' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('w-4 h-4 rounded-sm', item.cls)} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Occupancy Grid */}
      <Card className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header Row */}
          <div className="flex border-b">
            <div className="w-40 p-3 text-xs font-medium text-muted-foreground shrink-0 border-r">
              Calendário
            </div>
            {weekDays.map(day => (
              <div key={day.toISOString()} className="flex-1 p-3 text-center border-r last:border-r-0">
                <div className="text-xs font-medium">{format(day, 'EEE', { locale: pt })}</div>
                <div className="text-[10px] text-muted-foreground">{format(day, 'd MMM', { locale: pt })}</div>
              </div>
            ))}
            <div className="w-20 p-3 text-center shrink-0">
              <div className="text-xs font-medium">Semana</div>
            </div>
          </div>

          {/* Calendar Rows */}
          {occupancyGrid.map(({ calendar, days, weekOccupancy }) => (
            <div key={calendar.id} className="flex border-b last:border-b-0 hover:bg-muted/30 transition-colors">
              <div className="w-40 p-3 flex items-center gap-2 shrink-0 border-r">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: calendar.color }} />
                <span className="text-sm truncate">{calendar.name}</span>
              </div>
              {days.map((dayData) => (
                <div
                  key={dayData.day.toISOString()}
                  className={cn(
                    'flex-1 p-2 border-r last:border-r-0 flex flex-col items-center justify-center gap-1 transition-colors',
                    getOccupancyColor(dayData.occupancy)
                  )}
                  title={`${dayData.count} evento(s), ${Math.round(dayData.occupancy * 100)}% ocupação`}
                >
                  <span className="text-lg font-semibold">{dayData.count}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(dayData.occupancy * 100)}%
                  </span>
                </div>
              ))}
              <div className="w-20 p-2 flex items-center justify-center shrink-0">
                <Badge variant={getOccupancyBadgeVariant(weekOccupancy)} className="text-[10px]">
                  {Math.round(weekOccupancy * 100)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {occupancyGrid.map(({ calendar, weekOccupancy, days }) => {
          const totalEvents = days.reduce((sum, d) => sum + d.count, 0);
          return (
            <Card key={calendar.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: calendar.color }} />
                <span className="text-sm font-medium truncate">{calendar.name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{totalEvents}</span>
                <Badge variant={getOccupancyBadgeVariant(weekOccupancy)} className="text-[10px]">
                  {getOccupancyLabel(weekOccupancy)}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {Math.round(weekOccupancy * 100)}% ocupação semanal
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
