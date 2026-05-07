import { useEntityTimeline } from '@/hooks/useKernel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Activity } from 'lucide-react';

interface Props {
  entity_type: string;
  entity_id: string;
  workspace_id?: string;
}

export function KernelEntityTimeline({ entity_type, entity_id }: Props) {
  const { data, isLoading } = useEntityTimeline(entity_type, entity_id);

  if (isLoading) return <Card className="p-4 text-sm text-muted-foreground">A carregar timeline…</Card>;
  if (!data?.length) return <Card className="p-6 text-center text-sm text-muted-foreground">Sem eventos no Kernel para esta entidade.</Card>;

  return (
    <div className="space-y-2">
      {data.map((entry: any) => (
        <Card key={entry.id} className="p-3 flex items-start gap-3">
          <div className="rounded-full bg-muted p-2 mt-0.5">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{entry.title}</span>
              {entry.timeline_type && <Badge variant="outline" className="text-xs">{entry.timeline_type}</Badge>}
              {entry.source_module && <Badge variant="secondary" className="text-xs">{entry.source_module}</Badge>}
            </div>
            {entry.description && <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(entry.occurred_at), { addSuffix: true, locale: pt })}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
