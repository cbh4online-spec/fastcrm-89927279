import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
} from "date-fns";
import { pt } from "date-fns/locale";

interface Visit {
  id: string;
  scheduled_at: string;
  visit_status: string;
  notes?: string;
  security_systems?: {
    system_type?: string;
    security_installation_sites?: { site_name?: string };
  };
}

interface Props {
  visits: Visit[];
  onVisitClick: (id: string) => void;
}

const statusDotColor: Record<string, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-primary",
  completed: "bg-green-500",
  cancelled: "bg-muted-foreground",
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function SecurityMaintenanceCalendar({ visits, onVisitClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const visitsByDate = useMemo(() => {
    const map = new Map<string, Visit[]>();
    visits.forEach((v) => {
      if (!v.scheduled_at) return;
      const key = format(new Date(v.scheduled_at), "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(v);
      map.set(key, arr);
    });
    return map;
  }, [visits]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Calendário de Visitas</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: pt })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex gap-3 mb-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Agendada</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Em Curso</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Concluída</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Em Atraso</span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayVisits = visitsByDate.get(key) || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={`min-h-[60px] p-1 border rounded-sm transition-colors ${
                    !inMonth ? "bg-muted/30 text-muted-foreground/40" : "bg-card"
                  } ${today ? "ring-1 ring-primary/50" : ""}`}
                >
                  <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""}`}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayVisits.slice(0, 3).map((v) => {
                      const sys = v.security_systems as any;
                      const site = sys?.security_installation_sites as any;
                      const isOverdue = v.visit_status === "scheduled" && isPast(new Date(v.scheduled_at)) && !isToday(new Date(v.scheduled_at));
                      const dotColor = isOverdue ? "bg-destructive" : (statusDotColor[v.visit_status] || "bg-muted-foreground");

                      return (
                        <Tooltip key={v.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onVisitClick(v.id)}
                              className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded flex items-center gap-1 hover:bg-accent/50 transition-colors truncate ${
                                isOverdue ? "bg-destructive/10 text-destructive" : "text-foreground"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                              <span className="truncate">{site?.site_name || sys?.system_type || "Visita"}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="font-semibold text-xs">{site?.site_name || "Visita"}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(v.scheduled_at), "HH:mm")} · {sys?.system_type || "—"}
                            </p>
                            <Badge variant={isOverdue ? "destructive" : "secondary"} className="mt-1 text-[10px]">
                              {isOverdue ? "Em Atraso" : statusLabel[v.visit_status] || v.visit_status}
                            </Badge>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayVisits.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">+{dayVisits.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
