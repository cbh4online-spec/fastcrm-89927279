import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Users, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface EventStatsBarProps {
  workspaceId: string | undefined;
}

function useEventStats(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["event-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const now = new Date().toISOString();

      const [eventsRes, upcomingRes, rsvpsRes] = await Promise.all([
        (supabase.from("community_events").select("id", { count: "exact", head: true }) as any)
          .eq("workspace_id", workspaceId),
        (supabase.from("community_events").select("id, starts_at, title") as any)
          .eq("workspace_id", workspaceId)
          .eq("status", "published")
          .gte("starts_at", now)
          .order("starts_at")
          .limit(1),
        (supabase.from("event_rsvps").select("status") as any)
          .eq("workspace_id", workspaceId),
      ]);

      const totalEvents = eventsRes.count || 0;
      const nextEvent = upcomingRes.data?.[0] || null;
      
      const rsvpList = rsvpsRes.data || [];
      const confirmedCount = rsvpList.filter((r: any) => r.status === "confirmed").length;
      const attendedCount = rsvpList.filter((r: any) => r.status === "attended").length;
      const totalRsvps = rsvpList.length;

      return { totalEvents, nextEvent, confirmedCount, attendedCount, totalRsvps };
    },
    enabled: !!workspaceId,
  });
}

export function EventStatsBar({ workspaceId }: EventStatsBarProps) {
  const { data: stats } = useEventStats(workspaceId);

  if (!stats) return null;

  const kpis = [
    {
      icon: CalendarDays,
      label: "Total Eventos",
      value: stats.totalEvents.toString(),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Users,
      label: "Total RSVPs",
      value: stats.totalRsvps.toString(),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: CheckCircle2,
      label: "Confirmados",
      value: stats.confirmedCount.toString(),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: TrendingUp,
      label: "Presenças",
      value: stats.attendedCount.toString(),
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.nextEvent && (
        <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Próximo: {stats.nextEvent.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Começa em {formatDistanceToNow(new Date(stats.nextEvent.starts_at), { locale: pt })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
