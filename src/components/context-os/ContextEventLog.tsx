import { useContextEventLog } from '@/hooks/useContextEventLog';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Loader2, Activity } from 'lucide-react';

const EVENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'context.block.created', label: 'Bloco criado' },
  { value: 'context.block.updated', label: 'Bloco atualizado' },
  { value: 'context.block.verified', label: 'Bloco verificado' },
  { value: 'drift.computed', label: 'Drift calculado' },
  { value: 'drift.threshold.crossed', label: 'Drift threshold' },
  { value: 'command.executed', label: 'Comando executado' },
  { value: 'dependency.created', label: 'Dependência criada' },
  { value: 'alert.created', label: 'Alerta criado' },
  { value: 'brief.generated', label: 'Brief gerado' },
];

export function ContextEventLog() {
  const [typeFilter, setTypeFilter] = useState('');
  const { events, isLoading } = useContextEventLog(typeFilter || undefined);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-primary" />
          Event Log
        </h3>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 text-xs h-8"><SelectValue placeholder="Filtrar tipo..." /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events?.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Sem eventos registados</p>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1">
            {events?.map((event) => (
              <div key={event.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/10 border border-border/20 text-xs">
                <span className="font-mono text-primary/70 shrink-0">{event.type}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {event.entity_type ? `${event.entity_type}` : ''}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: pt })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
