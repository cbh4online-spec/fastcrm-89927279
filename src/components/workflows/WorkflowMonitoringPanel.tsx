/**
 * Workflow Monitoring Dashboard Panel
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WorkflowExecutionCard } from './WorkflowExecutionCard';
import { WorkflowExecutionDetails } from './WorkflowExecutionDetails';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { 
  useWorkflowExecutions, 
  useWorkflowStats,
  useCancelWorkflowExecution,
  useRetryWorkflowExecution,
} from '@/hooks/useWorkflowExecutions';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface WorkflowMonitoringPanelProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

export function WorkflowMonitoringPanel({ entityType, entityId, compact = false }: WorkflowMonitoringPanelProps) {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: stats, isLoading: statsLoading } = useWorkflowStats();
  const { data: executions, isLoading: executionsLoading, refetch } = useWorkflowExecutions({
    status: statusFilter === 'all' ? undefined : statusFilter,
    entityType,
    entityId,
    limit: compact ? 5 : 20,
  });

  const cancelMutation = useCancelWorkflowExecution();
  const retryMutation = useRetryWorkflowExecution();

  const handleViewDetails = (id: string) => {
    setSelectedExecutionId(id);
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const handleRetry = (id: string) => {
    retryMutation.mutate(id);
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Workflows Recentes
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-6 w-6">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {executionsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !executions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum workflow executado
            </p>
          ) : (
            <div className="space-y-2">
              {executions.slice(0, 5).map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => setSelectedExecutionId(execution.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{execution.workflow_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {execution.trigger_type}
                    </p>
                  </div>
                  <WorkflowStatusBadge status={execution.status} showIcon={false} />
                </div>
              ))}
            </div>
          )}

          <Sheet open={!!selectedExecutionId} onOpenChange={(open) => !open && setSelectedExecutionId(null)}>
            <SheetContent className="w-full sm:max-w-md p-0">
              {selectedExecutionId && (
                <WorkflowExecutionDetails
                  executionId={selectedExecutionId}
                  onClose={() => setSelectedExecutionId(null)}
                />
              )}
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Pendente</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">A Executar</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.running || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Concluído</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.completed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Falhado</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.failed || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Executions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execuções de Workflow</CardTitle>
              <CardDescription>Monitorize e gerencie workflows em execução</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="running">A Executar</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
              <TabsTrigger value="failed">Falhados</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter}>
              {executionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !executions?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma execução encontrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-4 pr-4">
                    {executions.map((execution) => (
                      <WorkflowExecutionCard
                        key={execution.id}
                        execution={execution}
                        onViewDetails={handleViewDetails}
                        onCancel={handleCancel}
                        onRetry={handleRetry}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={!!selectedExecutionId} onOpenChange={(open) => !open && setSelectedExecutionId(null)}>
        <SheetContent className="w-full sm:max-w-md p-0">
          {selectedExecutionId && (
            <WorkflowExecutionDetails
              executionId={selectedExecutionId}
              onClose={() => setSelectedExecutionId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
