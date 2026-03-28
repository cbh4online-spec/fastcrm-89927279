import { Mail, Clock, CheckCircle2, XCircle, Eye, MousePointer, Reply } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'waiting' | 'completed' | 'exited';
  label: string;
  date: string;
}

const eventIcons: Record<string, { icon: React.ElementType; color: string }> = {
  sent: { icon: Mail, color: 'text-blue-500' },
  opened: { icon: Eye, color: 'text-emerald-500' },
  clicked: { icon: MousePointer, color: 'text-violet-500' },
  replied: { icon: Reply, color: 'text-primary' },
  bounced: { icon: XCircle, color: 'text-destructive' },
  waiting: { icon: Clock, color: 'text-amber-500' },
  completed: { icon: CheckCircle2, color: 'text-emerald-600' },
  exited: { icon: XCircle, color: 'text-muted-foreground' },
};

interface EnrollmentTimelineProps {
  enrollmentId: string;
}

export function EnrollmentTimeline({ enrollmentId }: EnrollmentTimelineProps) {
  // For now, generate placeholder events based on enrollment
  // In a real implementation, this would query an activity_log / email_send_log table
  const events: TimelineEvent[] = [
    {
      id: '1',
      type: 'sent',
      label: 'Email da etapa 1 enviado',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'opened',
      label: 'Email aberto pelo contacto',
      date: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'waiting',
      label: 'Aguardando 2 dias antes da próxima etapa',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

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
