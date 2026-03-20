import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, MousePointerClick, AlertTriangle, Eye, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface WebhookEvent {
  id: string;
  event_type: string;
  email: string;
  link_url: string | null;
  occurred_at: string;
  campaign_id: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  delivered: { label: 'Entregue', icon: Mail, color: 'bg-green-100 text-green-800' },
  opened: { label: 'Aberto', icon: Eye, color: 'bg-blue-100 text-blue-800' },
  clicked: { label: 'Clicado', icon: MousePointerClick, color: 'bg-purple-100 text-purple-800' },
  bounced: { label: 'Bounce', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  complained: { label: 'Spam', icon: XCircle, color: 'bg-red-100 text-red-800' },
  unsubscribed: { label: 'Cancelado', icon: XCircle, color: 'bg-amber-100 text-amber-800' },
};

export function WebhookEventsPanel() {
  const { currentWorkspace } = useWorkspace();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Initial load
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('marketing_events')
        .select('id, event_type, email, link_url, occurred_at, campaign_id')
        .eq('workspace_id', currentWorkspace.id)
        .order('occurred_at', { ascending: false })
        .limit(50);

      if (data) setEvents(data as WebhookEvent[]);
    };

    fetchEvents();
  }, [currentWorkspace?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspace?.id || !isLive) return;

    const channel = supabase
      .channel('marketing-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_events',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          const newEvent = payload.new as WebhookEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, isLive]);

  const eventCounts = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Eventos em Tempo Real
        </CardTitle>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          )}
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLive ? 'Pausar' : 'Retomar'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(eventCounts).map(([type, count]) => {
            const config = EVENT_CONFIG[type];
            if (!config) return null;
            return (
              <Badge key={type} variant="secondary" className={`text-xs ${config.color}`}>
                {config.label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Event feed */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento recebido ainda
              </p>
            ) : (
              events.map((event) => {
                const config = EVENT_CONFIG[event.event_type] || {
                  label: event.event_type,
                  icon: Mail,
                  color: 'bg-muted text-muted-foreground',
                };
                const Icon = config.icon;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">
                        {event.email}
                      </span>
                      {event.link_url && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {event.link_url}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${config.color}`}>
                      {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(event.occurred_at), {
                        addSuffix: true,
                        locale: pt,
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
