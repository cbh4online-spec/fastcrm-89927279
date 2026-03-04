import { useKernelDecisions } from '@/hooks/useKernelDecisions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Play, ShieldCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const priorityColor = (p: number) =>
  p >= 0.8 ? 'text-destructive bg-destructive/10' :
  p >= 0.5 ? 'text-amber-500 bg-amber-500/10' :
  'text-muted-foreground bg-muted/30';

export function KernelApprovalQueue() {
  const { approvalQueue, isLoading, acceptDecision, rejectDecision, executeDecision } = useKernelDecisions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!approvalQueue?.length) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma decisão aguarda aprovação</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {approvalQueue.map((decision) => {
        const actions = (decision.recommended_actions as any[]) ?? [];
        return (
          <Card key={decision.id} className="border-border/50 hover:border-amber-500/30 transition-colors">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", priorityColor(decision.priority))}>
                      P{Math.round(decision.priority * 100)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-amber-500 bg-amber-500/10">
                      Requer Aprovação
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{decision.summary}</p>
                  {decision.rationale && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{decision.rationale}</p>
                  )}
                </div>
              </div>

              {actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((a: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-muted/30 text-[10px] font-mono text-muted-foreground">
                      {a.action_key}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => {
                    acceptDecision.mutate(decision.id);
                  }}
                  disabled={acceptDecision.isPending}
                >
                  <Check className="h-3 w-3" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                  onClick={() => {
                    acceptDecision.mutate(decision.id, {
                      onSuccess: () => executeDecision.mutate(decision.id),
                    });
                  }}
                  disabled={acceptDecision.isPending || executeDecision.isPending}
                >
                  <Play className="h-3 w-3" /> Aprovar & Executar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                  onClick={() => rejectDecision.mutate(decision.id)}
                  disabled={rejectDecision.isPending}
                >
                  <X className="h-3 w-3" /> Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
