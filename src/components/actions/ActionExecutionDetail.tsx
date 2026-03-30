import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, User, Zap } from 'lucide-react';
import type { ActionExecution } from '@/hooks/useActionExecution';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/20 text-amber-600', icon: <Clock className="h-3 w-3" /> },
  processing: { label: 'Em execução', color: 'bg-blue-500/20 text-blue-600', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-600', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Falhou', color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
  skipped: { label: 'Ignorada', color: 'bg-muted text-muted-foreground', icon: <AlertTriangle className="h-3 w-3" /> },
};

const sourceLabels: Record<string, string> = {
  command_center: 'Command Center',
  next_best_action: 'Next Best Action',
  optimization_recommendation: 'Otimização',
  manual: 'Manual',
  automation: 'Automação',
};

interface ActionExecutionDetailProps {
  execution: ActionExecution;
  onClose: () => void;
}

export function ActionExecutionDetail({ execution, onClose }: ActionExecutionDetailProps) {
  const st = statusConfig[execution.status] ?? statusConfig.pending;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {execution.title}
          </SheetTitle>
          <SheetDescription>{execution.description || execution.action_type}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={st.color}>
              {st.icon}
              <span className="ml-1">{st.label}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              {execution.action_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {execution.execution_mode}
            </Badge>
          </div>

          {/* Metadata */}
          <Card>
            <CardContent className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Origem</span>
                <span className="font-medium">{sourceLabels[execution.source_type] ?? execution.source_type}</span>
              </div>
              {execution.entity_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entidade</span>
                  <span className="font-medium">{execution.entity_type}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{new Date(execution.created_at).toLocaleString('pt-PT')}</span>
              </div>
              {execution.executed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executado em</span>
                  <span>{new Date(execution.executed_at).toLocaleString('pt-PT')}</span>
                </div>
              )}
              {execution.correlation_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correlation ID</span>
                  <span className="text-xs font-mono truncate max-w-[200px]">{execution.correlation_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payload */}
          {execution.payload_json && Object.keys(execution.payload_json).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Inputs (Payload)</h4>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(execution.payload_json, null, 2)}
                </pre>
              </div>
            </>
          )}

          {/* Result */}
          {execution.result_json && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Resultado</h4>
                <pre className="text-xs bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(execution.result_json, null, 2)}
                </pre>
              </div>
            </>
          )}

          {/* Error */}
          {execution.error_message && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2">Erro</h4>
                <p className="text-sm bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                  {execution.error_message}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
