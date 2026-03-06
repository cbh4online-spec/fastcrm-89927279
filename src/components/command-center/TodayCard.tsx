import { useTasks } from "@/hooks/useTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendars } from "@/hooks/useCalendars";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfDay, endOfDay } from "date-fns";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function TodayCard({ delay = 0 }: { delay?: number }) {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useTasks({ status: "pending" });
  const { calendars } = useCalendars();
  const calendarIds = calendars?.map((c) => c.id) ?? [];
  const today = new Date();
  const { events, isLoading: eventsLoading, error: eventsErrorMsg } = useCalendarEvents(calendarIds, {
    start: startOfDay(today),
    end: endOfDay(today),
  });

  const isLoading = tasksLoading || eventsLoading;
  const isError = tasksError || !!eventsErrorMsg;

  const [timedOut, setTimedOut] = useState(false);

  // 8-second skeleton timeout
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </motion.div>
    );
  }

  // Error or timeout state
  if (isError || (isLoading && timedOut)) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            Hoje — {format(today, "d 'de' MMMM")}
          </h3>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Não foi possível carregar os dados. 
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 ml-auto"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      </motion.div>
    );
  }

  // Tasks due today
  const todayStr = format(today, "yyyy-MM-dd");
  const todayTasks = (tasks ?? [])
    .filter((t) => t.due_at && t.due_at.startsWith(todayStr))
    .slice(0, 4);

  const hasContent = events.length > 0 || todayTasks.length > 0;

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            Hoje — {format(today, "d 'de' MMMM")}
          </h3>
        </div>
      </div>

      {!hasContent && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Sem reuniões agendadas para hoje.</p>
          <p className="text-xs text-muted-foreground">Sem tarefas para hoje.</p>
          <p className="text-xs text-muted-foreground/60">Dia livre 🎉</p>
        </div>
      )}

      {/* Meetings */}
      {events.length > 0 && (
        <div className="space-y-1">
          {events.slice(0, 3).map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30">
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{ backgroundColor: (ev as any).calendar?.color || "hsl(var(--primary))" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(ev.start_time), "HH:mm")} – {format(new Date(ev.end_time), "HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {todayTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tarefas</p>
          {todayTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-foreground truncate flex-1">{t.title}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
