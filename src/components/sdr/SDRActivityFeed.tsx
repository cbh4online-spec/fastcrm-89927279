import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Calendar, Trophy, XCircle, Mail, UserPlus, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityEvent {
  id: string;
  prospect_name: string | null;
  prospect_email: string | null;
  status: string;
  channel: string | null;
  updated_at: string;
  campaign_id: string;
}

const statusConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  enrolled: { icon: UserPlus, label: "Enrolled", color: "text-blue-500" },
  enriching: { icon: Mail, label: "A enriquecer", color: "text-indigo-500" },
  sequenced: { icon: Mail, label: "Em sequência", color: "text-violet-500" },
  replied: { icon: MessageSquare, label: "Respondeu", color: "text-amber-500" },
  positive_reply: { icon: MessageSquare, label: "Reply positivo", color: "text-emerald-500" },
  meeting_set: { icon: Calendar, label: "Reunião marcada", color: "text-emerald-600" },
  converted: { icon: Trophy, label: "Convertido", color: "text-green-600" },
  opted_out: { icon: XCircle, label: "Opt-out", color: "text-destructive" },
  failed: { icon: AlertTriangle, label: "Falhou", color: "text-destructive" },
};

export function SDRActivityFeed() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const [realtimeEvents, setRealtimeEvents] = useState<ActivityEvent[]>([]);

  const { data: dbEvents = [] } = useQuery({
    queryKey: ["sdr-activity-feed", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("sdr_enrollments")
        .select("id, prospect_name, prospect_email, status, channel, updated_at, campaign_id")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(30);
      return (data || []) as ActivityEvent[];
    },
    enabled: !!workspaceId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel("sdr-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sdr_enrollments", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const newEvent = payload.new as ActivityEvent;
          if (newEvent) {
            setRealtimeEvents((prev) => [newEvent, ...prev].slice(0, 10));
            queryClient.invalidateQueries({ queryKey: ["sdr-aggregated-stats"] });
            queryClient.invalidateQueries({ queryKey: ["sdr-campaigns"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  // Merge realtime events on top, deduplicate by id
  const allEvents = [...realtimeEvents, ...dbEvents];
  const seen = new Set<string>();
  const events = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  }).slice(0, 30);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Actividade em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[360px] px-4 pb-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem actividade recente</p>
          ) : (
            <AnimatePresence initial={false}>
              <div className="space-y-2">
                {events.map((event) => {
                  const cfg = statusConfig[event.status] || statusConfig.enrolled;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={event.id + event.status}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className={`mt-0.5 ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          <span className="font-medium">{event.prospect_name || event.prospect_email || "Prospect"}</span>
                          {" "}
                          <span className="text-muted-foreground">{cfg.label.toLowerCase()}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.channel && (
                            <Badge variant="outline" className="text-[10px] h-4 capitalize">{event.channel}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(event.updated_at), { addSuffix: true, locale: pt })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
