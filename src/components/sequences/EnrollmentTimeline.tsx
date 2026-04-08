import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Clock, CheckCircle2, XCircle, Eye, MousePointer, Reply, AlertCircle, Loader2 } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'waiting' | 'completed' | 'failed';
  label: string;
  date: string;
  channel?: string;
}

const eventIcons: Record<string, { icon: React.ElementType; color: string }> = {
  sent: { icon: Mail, color: 'text-blue-500' },
  opened: { icon: Eye, color: 'text-emerald-500' },
  clicked: { icon: MousePointer, color: 'text-violet-500' },
  replied: { icon: Reply, color: 'text-primary' },
  bounced: { icon: XCircle, color: 'text-destructive' },
  waiting: { icon: Clock, color: 'text-amber-500' },
  completed: { icon: CheckCircle2, color: 'text-emerald-600' },
  failed: { icon: AlertCircle, color: 'text-destructive' },
};

interface EnrollmentTimelineProps {
  enrollmentId: string;
}

export function EnrollmentTimeline({ enrollmentId }: EnrollmentTimelineProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['enrollment-timeline', enrollmentId],
    queryFn: async () => {
      // Fetch real step logs
      const { data: logs, error } = await supabase
        .from('sdr_sequence_step_logs')
        .select('id, channel, status, sent_at, opened_at, clicked_at, replied_at, error_message, created_at, sequence_step_id')
        .eq('sdr_enrollment_id', enrollmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const timeline: TimelineEvent[] = [];

      for (const log of (logs || [])) {
        const stepLabel = `Step (${log.channel || 'email'})`;

        // Sent event
        if (log.sent_at || log.status === 'sent') {
          timeline.push({
            id: `${log.id}-sent`,
            type: 'sent',
            label: `${stepLabel} enviado`,
            date: log.sent_at || log.created_at,
            channel: log.channel,
          });
        }

        // Failed event
        if (log.status === 'failed') {
          timeline.push({
            id: `${log.id}-failed`,
            type: 'failed',
            label: `${stepLabel} falhou${log.error_message ? `: ${log.error_message.slice(0, 50)}` : ''}`,
            date: log.created_at,
            channel: log.channel,
          });
        }

        // Opened
        if (log.opened_at) {
          timeline.push({
            id: `${log.id}-opened`,
            type: 'opened',
            label: 'Email aberto',
            date: log.opened_at,
            channel: log.channel,
          });
        }

        // Clicked
        if (log.clicked_at) {
          timeline.push({
            id: `${log.id}-clicked`,
            type: 'clicked',
            label: 'Link clicado',
            date: log.clicked_at,
            channel: log.channel,
          });
        }

        // Replied
        if (log.replied_at) {
          timeline.push({
            id: `${log.id}-replied`,
            type: 'replied',
            label: 'Resposta recebida',
            date: log.replied_at,
            channel: log.channel,
          });
        }
      }

      // Check for next scheduled step (waiting state)
      const { data: enrollment } = await supabase
        .from('sdr_enrollments')
        .select('next_send_at, status, current_step')
        .eq('id', enrollmentId)
        .maybeSingle();

      if (enrollment?.next_send_at && enrollment.status === 'sequenced') {
        timeline.push({
          id: 'next-waiting',
          type: 'waiting',
          label: `Aguardando Step ${(enrollment.current_step || 0) + 1}`,
          date: enrollment.next_send_at,
        });
      }

      if (enrollment?.status === 'completed') {
        timeline.push({
          id: 'completed',
          type: 'completed',
          label: 'Sequência concluída',
          date: logs?.[logs.length - 1]?.created_at || new Date().toISOString(),
        });
      }

      // Sort by date
      timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return timeline;
    },
    enabled: !!enrollmentId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-3">
        Sem atividade registada
      </p>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-3">
        {events.map((event) => {
          const cfg = eventIcons[event.type] || eventIcons.sent;
          const Icon = cfg.icon;
          return (
            <div key={event.id} className="relative flex items-start gap-3">
              <div className={`relative z-10 h-4 w-4 rounded-full bg-background border flex items-center justify-center ${cfg.color}`}>
                <Icon className="h-2.5 w-2.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{event.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(event.date).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
