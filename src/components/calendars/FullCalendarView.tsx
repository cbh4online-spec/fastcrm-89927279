import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { CalendarEvent, Calendar } from "@/hooks/useCalendars";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode = "month" | "week" | "day";

interface FullCalendarViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  selectedCalendarIds: string[];
  currentDate: Date;
  viewMode: ViewMode;
  onCreateEvent: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const viewModeMap: Record<ViewMode, string> = {
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
};

export function FullCalendarAgenda({
  events,
  calendars,
  selectedCalendarIds,
  currentDate,
  viewMode,
  onCreateEvent,
  onEventClick,
}: FullCalendarViewProps) {
  const calRef = useRef<any>(null);
  const [loaded, setLoaded] = useState<{
    FullCalendar: any;
    plugins: any[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@fullcalendar/react"),
      import("@fullcalendar/daygrid"),
      import("@fullcalendar/timegrid"),
      import("@fullcalendar/list"),
      import("@fullcalendar/interaction"),
    ]).then(([fc, dg, tg, li, ia]) => {
      if (!cancelled) {
        setLoaded({
          FullCalendar: fc.default,
          plugins: [dg.default, tg.default, li.default, ia.default],
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((c) => map.set(c.id, c.color || "#3B82F6"));
    return map;
  }, [calendars]);

  const fcEvents = useMemo(() => {
    return events
      .filter((e) => selectedCalendarIds.includes(e.calendar_id))
      .map((e) => {
        const color = (e.metadata as any)?._categoryColor || calendarColorMap.get(e.calendar_id) || "#3B82F6";
        return {
          id: e.id,
          title: e.title,
          start: e.start_time,
          end: e.end_time,
          allDay: e.all_day,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { original: e },
        };
      });
  }, [events, selectedCalendarIds, calendarColorMap]);

  const handleDateClick = useCallback(
    (info: any) => {
      onCreateEvent(info.date);
    },
    [onCreateEvent],
  );

  const handleEventClick = useCallback(
    (info: any) => {
      const original = info.event.extendedProps?.original as CalendarEvent;
      if (original) onEventClick(original);
    },
    [onEventClick],
  );

  if (!loaded) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const { FullCalendar, plugins } = loaded;

  return (
    <div className="h-full min-h-0 overflow-hidden fc-dark-theme [&_.fc]:h-full [&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:gap-2 [&_.fc-button]:!bg-primary/10 [&_.fc-button]:!border-primary/20 [&_.fc-button]:!text-foreground [&_.fc-button-active]:!bg-primary [&_.fc-button-active]:!text-primary-foreground [&_.fc-day-today]:!bg-primary/5 [&_.fc-event]:!rounded-md [&_.fc-event]:!px-1.5 [&_.fc-event]:!py-0.5 [&_.fc-event]:!text-xs [&_.fc-event]:!border-0 [&_.fc-event]:!shadow-sm [&_.fc-col-header-cell]:!bg-muted/30 [&_.fc-col-header-cell]:!text-muted-foreground [&_.fc-col-header-cell]:!text-xs [&_.fc-col-header-cell]:!font-semibold [&_.fc-scrollgrid]:!border-border/50 [&_.fc-scrollgrid td]:!border-border/30 [&_.fc-scrollgrid th]:!border-border/30 [&_.fc-timegrid-slot]:!h-10">
      <FullCalendar
        ref={calRef}
        plugins={plugins}
        initialView={viewModeMap[viewMode]}
        initialDate={currentDate}
        events={fcEvents}
        headerToolbar={false}
        locale="pt"
        firstDay={1}
        height="100%"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        editable={false}
        selectable
        dayMaxEvents={4}
        nowIndicator
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        allDayText="Dia todo"
        noEventsText="Sem eventos"
      />
    </div>
  );
}
