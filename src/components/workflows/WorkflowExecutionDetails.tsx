/**
 * Workflow Execution Details Panel
 */

import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowStatusBadge, WorkflowStepStatusIcon } from './WorkflowStatusBadge';
import { 
  X, 
  RefreshCw, 
  Clock,
  Target,
  User,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useWorkflowExecutionDetails, useCancelWorkflowExecution, useRetryWorkflowExecution } from '@/hooks/useWorkflowExecutions';
import { cn } from '@/lib/utils';

interface WorkflowExecutionDetailsProps {
  executionId: string;
  onClose: () => void;
}

const stepTypeLabels: Record<string, string> = {
  create_task: 'Criar Tarefa',
  update_stage: 'Atualizar Etapa',
  send_notification: 'Enviar Notificação',
  send_email: 'Enviar Email',
  send_whatsapp: 'Enviar WhatsApp',
  log_activity: 'Registar Atividade',
  wait: 'Aguardar',
  condition_check: 'Verificar Condição',
  webhook: 'Chamar Webhook',
};

export function WorkflowExecutionDetails({ executionId, onClose }: WorkflowExecutionDetailsProps) {
  const { data, isLoading } = useWorkflowExecutionDetails(executionId);
  const cancelMutation = useCancelWorkflowExecution();
  const retryMutation = useRetryWorkflowExecution();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Execução não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const { execution, steps } = data;
  const isActive = ['pending', 'queued', 'running'].includes(execution.status);
  const canRetry = ['failed', 'partial'].includes(execution.status);

  const handleCancel = () => {
    cancelMutation.mutate(executionId);
  };

  const handleRetry = () => {
    retryMutation.mutate(executionId);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{execution.workflow_code}</CardTitle>
            <WorkflowStatusBadge status={execution.status} />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Iniciado</p>
            <p className="font-medium">
              {execution.started_at
                ? format(new Date(execution.started_at), 'dd/MM/yyyy HH:mm', { locale: pt })
                : 'Não iniciado'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Duração</p>
            <p className="font-medium">
              {execution.total_duration_ms
                ? `${(execution.total_duration_ms / 1000).toFixed(1)}s`
                : '-'}
            </p>
          </div>
          {execution.entity_type && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Entidade</p>
              <p className="font-medium capitalize">{execution.entity_type}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-muted-foreground">Trigger</p>
            <p className="font-medium capitalize">{execution.trigger_type}</p>
          </div>
        </div>

        {/* Error message */}
        {execution.error_message && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <p className="font-medium mb-1">Erro:</p>
            <p>{execution.error_message}</p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Passos ({steps.length})</h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-start gap-3 p-2 rounded-lg',
                    step.status === 'completed' && 'bg-green-50 dark:bg-green-900/10',
                    step.status === 'failed' && 'bg-red-50 dark:bg-red-900/10',
                    step.status === 'running' && 'bg-amber-50 dark:bg-amber-900/10',
                    step.status === 'pending' && 'bg-muted/50',
                  )}
                >
                  {/* Step number and status */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <WorkflowStepStatusIcon status={step.status} className="h-4 w-4" />
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {stepTypeLabels[step.step_type] || step.step_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.step_code}
                    </p>
                    {step.duration_ms && (
                      <p className="text-xs text-muted-foreground">
                        {(step.duration_ms / 1000).toFixed(2)}s
                      </p>
                    )}
                    {step.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">
                        {step.error_message}
                      </p>
                    )}
                  </div>

                  {/* Retry count */}
                  {step.retry_count > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {step.retry_count} tentativas
                    </div>
                  )}
                </div>
              ))}

              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum passo registado
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="flex-1"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </>
              )}
            </Button>
          )}
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryMutation.isPending}
              className="flex-1"
            >
              {retryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Repetir
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
