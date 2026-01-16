import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Filter, 
  X, 
  CalendarDays, 
  Users, 
  Building2, 
  Tag,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Calendar as CalendarType, CalendarGroup } from '@/hooks/useCalendars';
import type { CalendarFilters } from './CalendarListView';

interface CalendarGlobalFiltersProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  calendars: CalendarType[];
  groups: CalendarGroup[];
}

export function CalendarGlobalFilters({
  filters,
  onFiltersChange,
  calendars,
  groups,
}: CalendarGlobalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof CalendarFilters>(key: K, value: CalendarFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      calendarType: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      calendarIds: [],
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.calendarType,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.calendarIds.length > 0,
  ].filter(Boolean).length;

  const toggleCalendar = (calendarId: string) => {
    const newIds = filters.calendarIds.includes(calendarId)
      ? filters.calendarIds.filter(id => id !== calendarId)
      : [...filters.calendarIds, calendarId];
    updateFilter('calendarIds', newIds);
  };

  return (
    <div className="border-b bg-card/50">
      {/* Main filter bar */}
      <div className="flex items-center gap-3 p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Pesquisar eventos..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="pl-9"
          />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Quick filters */}
        <Select
          value={filters.status || 'all'}
          onValueChange={v => updateFilter('status', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[140px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="tentative">Tentativos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.calendarType || 'all'}
          onValueChange={v => updateFilter('calendarType', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[140px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="internal">Interno</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
            <SelectItem value="event">Evento</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {filters.dateFrom || filters.dateTo ? (
                <span className="text-sm">
                  {filters.dateFrom && format(new Date(filters.dateFrom), 'dd/MM')}
                  {filters.dateFrom && filters.dateTo && ' - '}
                  {filters.dateTo && format(new Date(filters.dateTo), 'dd/MM')}
                </span>
              ) : (
                'Período'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>De</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => updateFilter('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => updateFilter('dateTo', e.target.value)}
                />
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateFilter('dateFrom', '');
                    updateFilter('dateTo', '');
                  }}
                >
                  Limpar datas
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Calendar filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendários
              {filters.calendarIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.calendarIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-auto">
              {calendars.map(calendar => (
                <div key={calendar.id} className="flex items-center gap-2">
                  <Checkbox
                    id={calendar.id}
                    checked={filters.calendarIds.includes(calendar.id)}
                    onCheckedChange={() => toggleCalendar(calendar.id)}
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: calendar.color }}
                  />
                  <Label htmlFor={calendar.id} className="flex-1 cursor-pointer">
                    {calendar.name}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Pesquisa: "{filters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('search', '')}
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Estado: {filters.status === 'confirmed' ? 'Confirmado' : filters.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('status', '')}
              />
            </Badge>
          )}
          {filters.calendarType && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.calendarType === 'internal' ? 'Interno' : filters.calendarType === 'client' ? 'Cliente' : 'Evento'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('calendarType', '')}
              />
            </Badge>
          )}
          {filters.calendarIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              {filters.calendarIds.length} calendário(s)
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('calendarIds', [])}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
