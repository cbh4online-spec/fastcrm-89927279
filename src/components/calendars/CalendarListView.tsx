import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Video, 
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { EmptyState } from '@/components/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/hooks/useCalendars';

interface CalendarListViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  filters: CalendarFilters;
  onEventClick: (event: CalendarEvent) => void;
}

export interface CalendarFilters {
  search: string;
  calendarType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  calendarIds: string[];
}

type SortField = 'start_time' | 'title' | 'calendar';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'bg-green-500' },
  tentative: { label: 'Tentativo', color: 'bg-yellow-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

export function CalendarListView({ 
  events, 
  calendars, 
  filters,
  onEventClick 
}: CalendarListViewProps) {
  const [sortField, setSortField] = useState<SortField>('start_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getCalendarColor = (calendarId: string, event?: CalendarEvent) => {
    const categoryColor = (event?.metadata as any)?._categoryColor;
    if (categoryColor) return categoryColor;
    return calendars.find(c => c.id === calendarId)?.color || '#3B82F6';
  };

  const getCalendarName = (calendarId: string) => {
    return calendars.find(c => c.id === calendarId)?.name || 'Calendário';
  };

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(search) ||
        e.description?.toLowerCase().includes(search) ||
        e.location?.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter(e => e.status === filters.status);
    }

    if (filters.calendarType && filters.calendarType !== 'all') {
      const typeCalendarIds = calendars
        .filter(c => c.calendar_type === filters.calendarType)
        .map(c => c.id);
      result = result.filter(e => typeCalendarIds.includes(e.calendar_id));
    }

    if (filters.dateFrom) {
      const fromDate = parseISO(filters.dateFrom);
      result = result.filter(e => isAfter(new Date(e.start_time), fromDate) || isSameDay(new Date(e.start_time), fromDate));
    }

    if (filters.dateTo) {
      const toDate = parseISO(filters.dateTo);
      result = result.filter(e => isBefore(new Date(e.start_time), toDate) || isSameDay(new Date(e.start_time), toDate));
    }

    if (filters.calendarIds.length > 0) {
      result = result.filter(e => filters.calendarIds.includes(e.calendar_id));
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'start_time':
          comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'calendar':
          comparison = getCalendarName(a.calendar_id).localeCompare(getCalendarName(b.calendar_id));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [events, filters, sortField, sortDirection, calendars]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const groupedByDate = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    filteredAndSortedEvents.forEach(event => {
      const dateKey = format(new Date(event.start_time), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );
  }, [filteredAndSortedEvents, sortDirection]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sort controls */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <span className="text-sm text-muted-foreground">Ordenar por:</span>
        {[
          { field: 'start_time' as SortField, label: 'Data' },
          { field: 'title' as SortField, label: 'Título' },
          { field: 'calendar' as SortField, label: 'Calendário' },
        ].map(({ field, label }) => (
          <Button
            key={field}
            variant={sortField === field ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => toggleSort(field)}
            className="gap-1"
          >
            {label}
            {sortField === field && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </Button>
        ))}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredAndSortedEvents.length} eventos
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-auto">
        {groupedByDate.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              type="calendar"
              title="Nenhum evento encontrado"
              description="Não há eventos para os filtros selecionados"
            />
          </div>
        ) : (
          <div className="divide-y">
            {groupedByDate.map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b">
                  <h3 className="font-semibold text-sm">
                    {format(parseISO(dateKey), "EEEE, d 'de' MMMM", { locale: pt })}
                  </h3>
                </div>

                {/* Events for this date */}
                <div className="divide-y divide-border/50">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time indicator */}
                        <div className="w-16 flex-shrink-0 text-sm">
                          {event.all_day ? (
                            <span className="text-muted-foreground">Dia inteiro</span>
                          ) : (
                            <div>
                              <div className="font-medium">
                                {format(new Date(event.start_time), 'HH:mm')}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {format(new Date(event.end_time), 'HH:mm')}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Color bar */}
                        <div 
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCalendarColor(event.calendar_id, event) }}
                        />

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{event.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                event.status === 'cancelled' && "line-through opacity-60"
                              )}
                            >
                              <div 
                                className={cn("w-2 h-2 rounded-full mr-1", statusLabels[event.status]?.color)}
                              />
                              {statusLabels[event.status]?.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {getCalendarName(event.calendar_id)}
                            </span>

                            {event.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}

                            {event.meeting_url && (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Videochamada
                              </span>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
