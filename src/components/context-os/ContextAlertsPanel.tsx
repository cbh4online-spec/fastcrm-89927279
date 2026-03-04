import { useContextAlerts } from '@/hooks/useContextAlerts';
import { ContextDriftBadge } from './ContextDriftBadge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Eye, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  onBlockClick?: (blockId: string) => void;
}

export function ContextAlertsPanel({ onBlockClick }: Props) {
  const { alerts, isLoading, unreadCount, markRead, resolve } = useContextAlerts();

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const active = alerts?.filter((a) => a.status !== 'resolved') ?? [];

  if (active.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
        Sem alertas ativos
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-2">
        {active.map((alert) => {
          const block = alert.context_blocks as unknown as { title: string; block_type: string } | null;
          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border text-sm space-y-1.5 transition-colors ${
                alert.status === 'unread'
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/30 bg-muted/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <ContextDriftBadge severity={alert.severity} compact />
                    <span className="font-medium text-xs">{alert.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  {block && (
                    <button
                      onClick={() => onBlockClick?.(alert.related_block_id!)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {block.title} ({block.block_type})
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: pt })}
                </span>
              </div>
              <div className="flex gap-1.5">
                {alert.status === 'unread' && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => markRead.mutate(alert.id)}>
                    <Eye className="h-3 w-3" /> Marcar lido
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => resolve.mutate(alert.id)}>
                  <Check className="h-3 w-3" /> Resolver
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
