import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useActionExecutions,
  useActionStats,
  useActionApprovals,
  useApproveAction,
  useRejectAction,
  type ActionExecution,
} from '@/hooks/useActionExecution';
import { ActionExecutionDetail } from '@/components/actions/ActionExecutionDetail';
import {
  Zap, CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, Eye, Check, X, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/20 text-amber-600' },
  processing: { label: 'Em execução', color: 'bg-blue-500/20 text-blue-600' },
  completed: { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-600' },
  failed: { label: 'Falhou', color: 'bg-destructive/20 text-destructive' },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground' },
};

export default function ActionExecutionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedExecution, setSelectedExecution] = useState<ActionExecution | null>(null);

  const filters: Record<string, string> = {};
  if (statusFilter !== 'all') filters.status = statusFilter;

  const { data: executions, isLoading } = useActionExecutions(filters);
  const { data: stats } = useActionStats();
  const { data: approvals } = useActionApprovals();
  const approveMutation = useApproveAction();
  const rejectMutation = useRejectAction();

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <PageHeader
          title="Execuções de Ações"
          description="Histórico e controlo de todas as ações operacionais executadas"
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-amber-500/20">
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats?.pending ?? 0}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{stats?.completed_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">Executadas hoje</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="p-3 text-center">
              <XCircle className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Falhadas</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-3 text-center">
              <ShieldCheck className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-primary">{stats?.approvals_pending ?? 0}</p>
              <p className="text-xs text-muted-foreground">Aprovações</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="executions">
          <TabsList>
            <TabsTrigger value="executions">Execuções</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1">
              Aprovações
              {(stats?.approvals_pending ?? 0) > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">{stats?.approvals_pending}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="executions" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Em execução</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (executions ?? []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Sem execuções registadas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(executions ?? []).map((exec) => {
                  const st = statusConfig[exec.status] ?? statusConfig.pending;
                  return (
                    <Card key={exec.id} className="group hover:shadow-sm transition-all">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-sm truncate">{exec.title}</h4>
                              <Badge className={cn('text-[10px] px-1.5', st.color)}>{st.label}</Badge>
                              <Badge variant="outline" className="text-[10px]">{exec.action_type}</Badge>
                              <Badge variant="outline" className="text-[10px]">{exec.source_type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(exec.created_at).toLocaleString('pt-PT')}
                              {exec.entity_type && ` · ${exec.entity_type}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => setSelectedExecution(exec)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3 mt-4">
            {(approvals ?? []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Sem aprovações pendentes.</p>
                </CardContent>
              </Card>
            ) : (
              (approvals ?? []).map((approval: any) => (
                <Card key={approval.id} className="border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {approval.action_executions?.title || 'Ação pendente'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {approval.action_executions?.action_type} · Requer aprovação humana
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600"
                          onClick={() => approveMutation.mutate(approval.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => rejectMutation.mutate({ approvalId: approval.id })}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {selectedExecution && (
          <ActionExecutionDetail
            execution={selectedExecution}
            onClose={() => setSelectedExecution(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
