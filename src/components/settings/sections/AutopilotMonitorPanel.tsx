import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface AutopilotEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any> | null;
  conversation_id: string;
  created_at: string;
  triggered_by: string | null;
}

interface EventStats {
  total: number;
  triggered: number;
  response_sent: number;
  errors: number;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  triggered: { label: "Acionado", icon: Zap, color: "text-blue-500", badgeVariant: "secondary" },
  response_sent: { label: "Resposta Enviada", icon: CheckCircle2, color: "text-emerald-500", badgeVariant: "default" },
  error: { label: "Erro", icon: AlertTriangle, color: "text-destructive", badgeVariant: "destructive" },
  sleeping: { label: "Em Pausa", icon: Clock, color: "text-yellow-500", badgeVariant: "outline" },
  skipped: { label: "Ignorado", icon: Activity, color: "text-muted-foreground", badgeVariant: "outline" },
};

export function AutopilotMonitorPanel() {
  const { currentWorkspace } = useWorkspace();
  const [events, setEvents] = useState<AutopilotEvent[]>([]);
  const [stats, setStats] = useState<EventStats>({ total: 0, triggered: 0, response_sent: 0, errors: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from("autopilot_events")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedEvents = (data || []) as unknown as AutopilotEvent[];
      setEvents(typedEvents);

      const newStats: EventStats = { total: typedEvents.length, triggered: 0, response_sent: 0, errors: 0 };
      for (const e of typedEvents) {
        if (e.event_type === "triggered") newStats.triggered++;
        else if (e.event_type === "response_sent") newStats.response_sent++;
        else if (e.event_type === "error") newStats.errors++;
      }
      setStats(newStats);
    } catch (err) {
      console.error("Error fetching autopilot events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentWorkspace?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const getEventConfig = (type: string) => {
    return EVENT_TYPE_CONFIG[type] || { label: type, icon: Activity, color: "text-muted-foreground", badgeVariant: "outline" as const };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-card">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-2xl font-bold">{stats.triggered}</span>
          <span className="text-xs text-muted-foreground">Acionados</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-card">
          <MessageSquare className="h-4 w-4 text-emerald-500" />
          <span className="text-2xl font-bold">{stats.response_sent}</span>
          <span className="text-xs text-muted-foreground">Respostas</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-card">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-2xl font-bold">{stats.errors}</span>
          <span className="text-xs text-muted-foreground">Erros</span>
        </div>
      </div>

      {/* Events List Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Últimos {events.length} eventos
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum evento do autopilot registado</p>
        </div>
      ) : (
        <ScrollArea className="h-[340px]">
          <div className="space-y-2 pr-3">
            {events.map((event) => {
              const config = getEventConfig(event.event_type);
              const IconComponent = config.icon;
              const eventData = event.event_data || {};

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className={`mt-0.5 ${config.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={config.badgeVariant} className="text-xs px-1.5 py-0">
                        {config.label}
                      </Badge>
                      {eventData.channel && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {eventData.channel}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: pt })}
                      </span>
                    </div>

                    {/* Event-specific details */}
                    {event.event_type === "response_sent" && eventData.message_preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        💬 {eventData.message_preview}
                      </p>
                    )}
                    {event.event_type === "error" && eventData.error && (
                      <p className="text-xs text-destructive line-clamp-2">
                        ⚠️ {eventData.error}
                      </p>
                    )}
                    {event.event_type === "triggered" && eventData.delay_seconds && (
                      <p className="text-xs text-muted-foreground">
                        ⏱️ Delay: {eventData.delay_seconds}s
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
