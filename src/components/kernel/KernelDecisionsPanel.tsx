import { useKernelDecisions } from '@/hooks/useKernelDecisions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Play, AlertTriangle, Loader2, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-chart-2',
  low: 'text-muted-foreground',
};

function priorityLabel(p: number) {
  if (p >= 0.8) return 'high';
  if (p >= 0.5) return 'medium';
  return 'low';
}

const TYPE_LABELS: Record<string, string> = {
  opportunity_stale: 'Oportunidade Parada',
  hot_lead_detected: 'Lead Quente',
  deal_score_drop: 'Deal em Risco',
};

export function KernelDecisionsPanel() {
  const { openDecisions, isLoading, acceptDecision, rejectDecision, executeDecision } = useKernelDecisions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!openDecisions.length) {
    return (
      <Card className="border-border/30">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
          <Brain className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sem decisões pendentes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-3">
        {openDecisions.map((d) => {
          const pLabel = priorityLabel(d.priority);
          return (
            <Card key={d.id} className="border-border/30 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[d.type] ?? d.type}
                      </Badge>
                      <span className={`text-[10px] font-medium ${PRIORITY_COLORS[pLabel]}`}>
                        {pLabel === 'high' ? '●' : pLabel === 'medium' ? '◐' : '○'} {pLabel}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-medium leading-tight">{d.summary}</CardTitle>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {d.rationale && (
                  <p className="text-xs text-muted-foreground">{d.rationale}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    onClick={() => executeDecision.mutate(d.id)}
                    disabled={executeDecision.isPending}
                  >
                    <Play className="h-3 w-3" /> Executar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => acceptDecision.mutate(d.id)}
                    disabled={acceptDecision.isPending}
                  >
                    <CheckCircle className="h-3 w-3" /> Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => rejectDecision.mutate(d.id)}
                    disabled={rejectDecision.isPending}
                  >
                    <XCircle className="h-3 w-3" /> Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
