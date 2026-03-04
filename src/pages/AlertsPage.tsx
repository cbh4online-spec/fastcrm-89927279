import { useState } from 'react';
import { useContextAlerts } from '@/hooks/useContextAlerts';
import { AlertPolicySettings } from '@/components/context-os/AlertPolicySettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Check, Eye, Clock, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FilterStatus = 'all' | 'unread' | 'read' | 'resolved' | 'snoozed';

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string }> = {
  ok: { icon: Info, color: 'text-muted-foreground' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500' },
  risk: { icon: ShieldAlert, color: 'text-orange-500' },
  critical: { icon: ShieldAlert, color: 'text-destructive' },
};

export default function AlertsPage() {
  const { alerts, isLoading, markRead, resolve, snooze } = useContextAlerts();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = alerts?.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'snoozed') return a.snooze_until && new Date(a.snooze_until) > new Date();
    return a.status === filter;
  }) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Alertas
          </h1>
          <p className="text-sm text-muted-foreground">Inbox de alertas do Context OS</p>
        </div>
      </div>

      <AlertPolicySettings />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'unread', 'read', 'snoozed', 'resolved'] as FilterStatus[]).map(s => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}
            className="text-xs capitalize"
          >
            {s === 'all' ? 'Todos' : s === 'unread' ? 'Não lidos' : s === 'read' ? 'Lidos' : s === 'snoozed' ? 'Adiados' : 'Resolvidos'}
          </Button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">Sem alertas</p>
      )}

      <div className="space-y-2">
        {filtered.map(alert => {
          const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.ok;
          const SevIcon = sev.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border p-4 transition-all",
                alert.status === 'unread' ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card/50'
              )}
            >
              <div className="flex items-start gap-3">
                <SevIcon className={cn("h-4 w-4 mt-0.5 shrink-0", sev.color)} />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{format(new Date(alert.created_at), 'dd/MM HH:mm')}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5">{alert.severity}</Badge>
                    {alert.context_blocks && (
                      <span className="text-primary">{(alert.context_blocks as any).title}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {alert.status === 'unread' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markRead.mutate(alert.id)} title="Marcar como lido">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {alert.status !== 'resolved' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => snooze.mutate({ alertId: alert.id, hours: 24 })} title="Adiar 24h">
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resolve.mutate(alert.id)} title="Resolver">
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
