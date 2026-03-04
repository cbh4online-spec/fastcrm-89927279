import { useKernelActions } from '@/hooks/useKernelActions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Loader2, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-chart-2" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function KernelActionsLog() {
  const { todayRuns, isLoading } = useKernelActions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!todayRuns.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Zap className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">Sem ações hoje</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-2">
        {todayRuns.map((run) => (
          <Card key={run.id} className="border-border/20">
            <CardContent className="py-2 px-3 flex items-center gap-3">
              {STATUS_ICON[run.status] ?? STATUS_ICON.queued}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{run.action_key}</p>
                {run.error && <p className="text-[10px] text-destructive truncate">{run.error}</p>}
              </div>
              <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: pt })}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
