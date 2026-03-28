import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Route, Mail, MousePointer, Eye, AlertTriangle, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TimelineEvent {
  type: string;
  date: string;
  label: string;
  detail?: string;
}

export function ContactJourneyTimeline() {
  const { currentWorkspace } = useWorkspace();
  const [searchEmail, setSearchEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['contact-journey', currentWorkspace?.id, activeEmail],
    queryFn: async () => {
      if (!currentWorkspace?.id || !activeEmail) return [];

      const timeline: TimelineEvent[] = [];

      // Get email events
      const { data: emailEvents } = await supabase
        .from('marketing_events')
        .select('event_type, occurred_at, campaign_id, link_url')
        .eq('workspace_id', currentWorkspace.id)
        .eq('email', activeEmail)
        .order('occurred_at', { ascending: false })
        .limit(100);

      emailEvents?.forEach(e => {
        const icons: Record<string, string> = {
          send: 'Email enviado',
          delivered: 'Email entregue',
          open: 'Email aberto',
          click: 'Link clicado',
          bounce: 'Bounce',
          complaint: 'Reclamação',
          unsubscribe: 'Cancelou subscrição',
        };
        timeline.push({
          type: e.event_type,
          date: e.occurred_at,
          label: icons[e.event_type] || e.event_type,
          detail: e.link_url || undefined,
        });
      });

      // Get clicks
      const { data: clicks } = await supabase
        .from('campaign_link_clicks')
        .select('link_url, link_label, clicked_at')
        .eq('workspace_id', currentWorkspace.id)
        .eq('recipient_email', activeEmail)
        .order('clicked_at', { ascending: false })
        .limit(50);

      clicks?.forEach(c => {
        timeline.push({
          type: 'link_click',
          date: c.clicked_at,
          label: `Clicou: ${c.link_label || c.link_url}`,
          detail: c.link_url,
        });
      });

      return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!currentWorkspace?.id && !!activeEmail,
  });

  const handleSearch = () => {
    if (searchEmail.includes('@')) {
      setActiveEmail(searchEmail.trim());
    }
  };

  const typeIcon: Record<string, React.ReactNode> = {
    send: <Mail className="h-3.5 w-3.5 text-blue-500" />,
    delivered: <Mail className="h-3.5 w-3.5 text-green-500" />,
    open: <Eye className="h-3.5 w-3.5 text-primary" />,
    click: <MousePointer className="h-3.5 w-3.5 text-indigo-500" />,
    link_click: <MousePointer className="h-3.5 w-3.5 text-indigo-500" />,
    bounce: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
    complaint: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
    unsubscribe: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          Jornada do Contacto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar por email..."
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {activeEmail ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{activeEmail}</span>
              <Badge variant="outline" className="text-[10px]">{events.length} eventos</Badge>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
            ) : events.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                  {events.map((event, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className="absolute left-[-18px] top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                        {typeIcon[event.type] || <Mail className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.detail && (
                          <p className="text-xs text-muted-foreground truncate">{event.detail}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(event.date), "d MMM yyyy, HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">
                Nenhum evento encontrado para este contacto
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Pesquise um email para ver a jornada completa do contacto
          </p>
        )}
      </CardContent>
    </Card>
  );
}
