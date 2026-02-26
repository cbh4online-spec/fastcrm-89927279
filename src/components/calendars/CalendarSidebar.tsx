import { useState, useMemo } from 'react';
import { Calendar, Plus, ChevronDown, ChevronRight, Eye, EyeOff, Settings, Palette } from 'lucide-react';
import { CATEGORY_COLORS } from '@/hooks/useCommunityEventsForCalendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  virtualCalendarIds?: string[];
  selectedCategories?: string[];
  onToggleCategory?: (key: string) => void;
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
  virtualCalendarIds = [],
  selectedCategories,
  onToggleCategory,
}: CalendarSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['ungrouped', 'virtual', ...groups.map(g => g.id)]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Separate real and virtual calendars
  const realCalendars = useMemo(() => calendars.filter(c => !virtualCalendarIds.includes(c.id)), [calendars, virtualCalendarIds]);
  const virtualCalendars = useMemo(() => calendars.filter(c => virtualCalendarIds.includes(c.id)), [calendars, virtualCalendarIds]);

  const groupedCalendars = useMemo(() => {
    return realCalendars.reduce((acc, calendar) => {
      const groupId = calendar.group_id || 'ungrouped';
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(calendar);
      return acc;
    }, {} as Record<string, CalendarType[]>);
  }, [realCalendars]);

  const allSelected = realCalendars.filter(c => c.status === 'active').length === selectedCalendarIds.filter(id => !virtualCalendarIds.includes(id)).length;

  return (
    <div className="w-64 border-r border-border/50 bg-gradient-to-b from-card/80 to-card/60 backdrop-blur-sm p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Calendários</h3>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onCreateCalendar}
          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs rounded-xl border-border/50 hover:bg-accent/50 transition-all duration-200"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? (
            <>
              <EyeOff className="h-3 w-3 mr-2" />
              Ocultar todos
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-2" />
              Mostrar todos
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
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group">
              <div className={cn(
                "transition-transform duration-200",
                expandedGroups.includes('ungrouped') ? "rotate-0" : "-rotate-90"
              )}>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Sem grupo</span>
              <Badge 
                variant="secondary" 
                className="ml-auto text-xs rounded-lg bg-muted/80"
              >
                {groupedCalendars['ungrouped'].length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
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
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group">
                <div className={cn(
                  "transition-transform duration-200",
                  expandedGroups.includes(group.id) ? "rotate-0" : "-rotate-90"
                )}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all duration-200"
                  style={{ 
                    backgroundColor: group.color,
                    boxShadow: `0 0 8px ${group.color}40`
                  }}
                />
                <span className="text-sm font-medium">{group.name}</span>
                <Badge 
                  variant="secondary" 
                  className="ml-auto text-xs rounded-lg bg-muted/80"
                >
                  {groupCalendars.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
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

        {/* Virtual calendars (Outros) */}
        {virtualCalendars.length > 0 && (
          <>
            <Separator className="my-2" />
            <Collapsible
              open={expandedGroups.includes('virtual')}
              onOpenChange={() => toggleGroup('virtual')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group">
                <div className={cn(
                  "transition-transform duration-200",
                  expandedGroups.includes('virtual') ? "rotate-0" : "-rotate-90"
                )}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Outros</span>
                <Badge 
                  variant="secondary" 
                  className="ml-auto text-xs rounded-lg bg-muted/80"
                >
                  {virtualCalendars.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                {virtualCalendars.map(calendar => (
                  <CalendarItem
                    key={calendar.id}
                    calendar={calendar}
                    isSelected={selectedCalendarIds.includes(calendar.id)}
                    onToggle={() => onToggleCalendar(calendar.id)}
                    onEdit={() => onEditCalendar(calendar)}
                    hideSettings
                  />
                ))}
              </CollapsibleContent>
          </Collapsible>
          </>
        )}

        {/* Category color legend */}
        {virtualCalendarIds.includes('community-events') && (
          <>
            <Separator className="my-2" />
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categorias</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(CATEGORY_COLORS).map(([key, color]) => {
                  const labels: Record<string, string> = {
                    networking: 'Networking',
                    jantar: 'Jantar',
                    workshop: 'Workshop',
                    webinar: 'Webinar',
                    conferencia: 'Conferência',
                    outro: 'Outro',
                  };
                  const isSelected = selectedCategories ? selectedCategories.includes(key) : true;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-1 cursor-pointer rounded-lg hover:bg-accent/40 py-1 transition-all duration-200"
                      onClick={() => onToggleCategory?.(key)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleCategory?.(key)}
                        className="border-2 rounded-md h-4 w-4 transition-all duration-200 data-[state=checked]:shadow-md"
                        style={{
                          borderColor: color as string,
                          backgroundColor: isSelected ? (color as string) : 'transparent',
                          boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none',
                        }}
                      />
                      <span className={cn("text-xs", isSelected ? "text-foreground" : "text-muted-foreground line-through")}>
                        {labels[key] || key}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CalendarItemProps {
  calendar: CalendarType;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  hideSettings?: boolean;
}

function CalendarItem({ calendar, isSelected, onToggle, onEdit, hideSettings }: CalendarItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-xl group transition-all duration-200",
        "hover:bg-accent/40 hover:shadow-sm",
        calendar.status === 'inactive' && "opacity-50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={calendar.status === 'inactive'}
        className="border-2 rounded-md transition-all duration-200 data-[state=checked]:shadow-md"
        style={{ 
          borderColor: calendar.color,
          backgroundColor: isSelected ? calendar.color : 'transparent',
          boxShadow: isSelected ? `0 2px 8px ${calendar.color}40` : 'none'
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{calendar.name}</span>
        <span className="text-xs text-muted-foreground">
          {calendarTypeLabels[calendar.calendar_type as keyof typeof calendarTypeLabels]}
        </span>
      </div>
      {!hideSettings && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background/80"
          onClick={onEdit}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
