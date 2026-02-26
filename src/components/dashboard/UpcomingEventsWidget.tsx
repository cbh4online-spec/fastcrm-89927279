import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { useUpcomingEventsWithRsvps } from "@/hooks/useUpcomingEventsWithRsvps";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function UpcomingEventsWidget() {
  const { data: events, isLoading } = useUpcomingEventsWithRsvps(5);
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : !events?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sem eventos futuros
          </p>
        ) : (
          events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => navigate(`/dashboard/events/${ev.id}`)}
              className="flex items-center gap-3 w-full py-2 px-1 rounded-md hover:bg-accent transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary leading-none">
                  {format(new Date(ev.starts_at), "d")}
                </span>
                <span className="text-[8px] text-primary/70 uppercase leading-none">
                  {format(new Date(ev.starts_at), "MMM", { locale: pt })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ev.starts_at), "d MMM, HH:mm", { locale: pt })}
                </p>
              </div>
              {ev.pendingCount > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/15 shrink-0">
                  {ev.pendingCount} pendente{ev.pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
