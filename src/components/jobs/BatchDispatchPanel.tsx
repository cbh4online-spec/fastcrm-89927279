import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParallelDispatch } from '@/hooks/useParallelDispatch';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  RefreshCw,
  Trash2,
  Zap,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchDispatchPanelProps {
  workspaceId: string;
  className?: string;
}

export function BatchDispatchPanel({ workspaceId, className }: BatchDispatchPanelProps) {
  const {
    isDispatching,
    lastResult,
    metrics,
    canDispatch,
    concurrencyReason,
    checkDispatchAvailability,
    refreshMetrics,
    cleanup,
  } = useParallelDispatch({ workspaceId });

  React.useEffect(() => {
    refreshMetrics();
    checkDispatchAvailability();
    
    const interval = setInterval(() => {
      refreshMetrics();
      checkDispatchAvailability();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshMetrics, checkDispatchAvailability]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'skipped':
        return <Pause className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      failed: 'destructive',
      queued: 'secondary',
      skipped: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Concurrency Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Concorrência
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cleanup}
                title="Limpar locks expirados"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshMetrics}
                disabled={isDispatching}
              >
                <RefreshCw className={cn('h-4 w-4', isDispatching && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Em Fila</p>
              <p className="text-2xl font-bold">{metrics?.queueDepth || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold">{metrics?.activeConcurrency || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lock Contention</p>
              <p className="text-2xl font-bold">{(metrics?.lockContentionRate || 0).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Duração Média</p>
              <p className="text-2xl font-bold">{((metrics?.avgTaskDurationMs || 0) / 1000).toFixed(1)}s</p>
            </div>
          </div>

          {!canDispatch && concurrencyReason && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Dispatch Pausado
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">{concurrencyReason}</p>
              </div>
            </div>
          )}

          {canDispatch && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Pronto para dispatch paralelo</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Batch Result */}
      {lastResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Último Batch</CardTitle>
            <CardDescription>
              {lastResult.batchId.slice(0, 8)}... • {lastResult.executionTimeMs}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-lg font-bold text-green-600">{lastResult.tasksDispatched}</p>
                <p className="text-xs text-muted-foreground">Iniciadas</p>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-lg font-bold text-yellow-600">{lastResult.tasksQueued}</p>
                <p className="text-xs text-muted-foreground">Em Fila</p>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-lg font-bold text-destructive">{lastResult.tasksFailed}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-lg font-bold text-muted-foreground">{lastResult.tasksSkipped}</p>
                <p className="text-xs text-muted-foreground">Ignoradas</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>
                  {lastResult.tasksDispatched} / {lastResult.tasksRequested}
                </span>
              </div>
              <Progress
                value={(lastResult.tasksDispatched / lastResult.tasksRequested) * 100}
                className="h-2"
              />
            </div>

            {/* Task Results */}
            {lastResult.results.length > 0 && (
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {lastResult.results.slice(0, 20).map((task, idx) => (
                    <div
                      key={task.taskId || idx}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="font-mono text-xs">{task.entityId.slice(0, 8)}...</span>
                        <Badge variant="outline" className="text-xs">
                          {task.entityType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.durationMs && (
                          <span className="text-xs text-muted-foreground">{task.durationMs}ms</span>
                        )}
                        {getStatusBadge(task.status)}
                      </div>
                    </div>
                  ))}
                  {lastResult.results.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{lastResult.results.length - 20} mais tarefas...
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Errors */}
            {lastResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-destructive mb-2">Erros:</p>
                <div className="space-y-1">
                  {lastResult.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {error.taskId.slice(0, 8)}: {error.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
