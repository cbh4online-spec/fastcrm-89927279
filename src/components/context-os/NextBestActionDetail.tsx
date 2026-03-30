import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNBALogs, type NextBestAction, type NBALog } from '@/hooks/useNextBestActions';
import { Check, X, Clock, TrendingUp, Shield, Zap, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  action: NextBestAction;
  onClose: () => void;
  onAct: () => void;
  onDismiss: () => void;
}

export function NextBestActionDetail({ action, onClose, onAct, onDismiss }: Props) {
  const { data: logs } = useNBALogs(action.id);

  const signals = action.source_signals_json ?? {};
  const signalEntries = Object.entries(signals);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            {action.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Meta */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {action.entity_type}
              </Badge>
              <Badge variant="outline" className={cn(
                'text-xs',
                action.urgency === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                action.urgency === 'high' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                'bg-muted'
              )}>
                Urgência: {action.urgency}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Confiança: {action.confidence}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Prioridade: {action.priority_score}
              </Badge>
            </div>

            {/* Description */}
            {action.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">Descrição</h4>
                <p className="text-sm">{action.description}</p>
              </div>
            )}

            {/* Rationale */}
            {action.rationale && (
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Razão
                </h4>
                <p className="text-sm text-foreground">{action.rationale}</p>
              </div>
            )}

            {/* Impact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold text-emerald-600">€{Number(action.impact_estimate).toLocaleString('pt-PT')}</p>
                <p className="text-[10px] text-muted-foreground">Impacto estimado</p>
              </div>
              {action.due_at && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                  <p className="text-sm font-bold">{new Date(action.due_at).toLocaleDateString('pt-PT')}</p>
                  <p className="text-[10px] text-muted-foreground">Data limite</p>
                </div>
              )}
            </div>

            {/* Signals */}
            {signalEntries.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Sinais</h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {signalEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Logs */}
            {(logs ?? []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <History className="h-3 w-3" /> Histórico
                </h4>
                <div className="space-y-1">
                  {(logs ?? []).map((log: NBALog) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{log.event_type}</span>
                      <span className="ml-auto">{new Date(log.created_at).toLocaleString('pt-PT')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onDismiss} className="gap-1">
            <X className="h-3 w-3" /> Ignorar
          </Button>
          <Button size="sm" onClick={onAct} className="gap-1">
            <Check className="h-3 w-3" /> Marcar executada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
