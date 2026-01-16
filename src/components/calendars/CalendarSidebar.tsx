import { useState } from 'react';
import { Calendar, Plus, ChevronDown, ChevronRight, Eye, EyeOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Calendar as CalendarType, CalendarGroup } from '@/hooks/useCalendars';

interface CalendarSidebarProps {
  calendars: CalendarType[];
  groups: CalendarGroup[];
  selectedCalendarIds: string[];
  onToggleCalendar: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateCalendar: () => void;
  onEditCalendar: (calendar: CalendarType) => void;
}

const calendarTypeLabels = {
  client: 'Cliente',
  internal: 'Interno',
  event: 'Evento',
};

export function CalendarSidebar({
  calendars,
  groups,
  selectedCalendarIds,
  onToggleCalendar,
  onSelectAll,
  onDeselectAll,
  onCreateCalendar,
  onEditCalendar,
}: CalendarSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['ungrouped', ...groups.map(g => g.id)]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const groupedCalendars = calendars.reduce((acc, calendar) => {
    const groupId = calendar.group_id || 'ungrouped';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(calendar);
    return acc;
  }, {} as Record<string, CalendarType[]>);

  const allSelected = calendars.filter(c => c.status === 'active').length === selectedCalendarIds.length;

  return (
    <div className="w-64 border-r bg-card/50 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Calendários</h3>
        <Button size="sm" variant="ghost" onClick={onCreateCalendar}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Ocultar
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Mostrar
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {/* Ungrouped calendars */}
        {groupedCalendars['ungrouped']?.length > 0 && (
          <Collapsible
            open={expandedGroups.includes('ungrouped')}
            onOpenChange={() => toggleGroup('ungrouped')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-accent/50">
              {expandedGroups.includes('ungrouped') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">Sem grupo</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {groupedCalendars['ungrouped'].length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1 mt-1">
              {groupedCalendars['ungrouped'].map(calendar => (
                <CalendarItem
                  key={calendar.id}
                  calendar={calendar}
                  isSelected={selectedCalendarIds.includes(calendar.id)}
                  onToggle={() => onToggleCalendar(calendar.id)}
                  onEdit={() => onEditCalendar(calendar)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Grouped calendars */}
        {groups.map(group => {
          const groupCalendars = groupedCalendars[group.id] || [];
          if (groupCalendars.length === 0) return null;

          return (
            <Collapsible
              key={group.id}
              open={expandedGroups.includes(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-accent/50">
                {expandedGroups.includes(group.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-sm font-medium">{group.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {groupCalendars.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1 mt-1">
                {groupCalendars.map(calendar => (
                  <CalendarItem
                    key={calendar.id}
                    calendar={calendar}
                    isSelected={selectedCalendarIds.includes(calendar.id)}
                    onToggle={() => onToggleCalendar(calendar.id)}
                    onEdit={() => onEditCalendar(calendar)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarItemProps {
  calendar: CalendarType;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function CalendarItem({ calendar, isSelected, onToggle, onEdit }: CalendarItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded group",
        calendar.status === 'inactive' && "opacity-50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={calendar.status === 'inactive'}
        className="border-2"
        style={{ 
          borderColor: calendar.color,
          backgroundColor: isSelected ? calendar.color : 'transparent'
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{calendar.name}</span>
        <span className="text-xs text-muted-foreground">
          {calendarTypeLabels[calendar.calendar_type]}
        </span>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onEdit}
      >
        <Settings className="h-3 w-3" />
      </Button>
    </div>
  );
}
