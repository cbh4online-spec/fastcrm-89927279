/**
 * Job Monitoring Panel Component
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTriggerJobs } from '@/hooks/useTriggerJobs';
import { RefreshCw, XCircle, RotateCcw, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  queued: { label: 'Em Fila', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'A Executar', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Concluído', variant: 'outline', icon: <CheckCircle className="h-3 w-3 text-green-500" /> },
  failed: { label: 'Falhou', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
  retrying: { label: 'A Tentar', variant: 'default', icon: <RotateCcw className="h-3 w-3 animate-spin" /> },
};

export function JobMonitoringPanel() {
  const { jobs, isLoading, refetch, cancelJob, retryJob } = useTriggerJobs({ 
    limit: 10, 
    autoRefresh: true, 
    refreshInterval: 5000 
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Jobs em Execução</CardTitle>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum job recente</p>
        ) : (
          jobs.map((job) => {
            const config = statusConfig[job.status] || statusConfig.pending;
            const progress = (job.output_data as Record<string, unknown>)?.lastProgress as { progress?: number } | undefined;
            
            return (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={config.variant} className="flex items-center gap-1">
                      {config.icon}
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">{job.job_type}</span>
                  </div>
                  {job.status === 'running' && progress?.progress !== undefined && (
                    <Progress value={progress.progress} className="h-1 mt-2" />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  {['pending', 'queued', 'running'].includes(job.status) && (
                    <Button variant="ghost" size="sm" onClick={() => cancelJob(job.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {['failed', 'cancelled'].includes(job.status) && (
                    <Button variant="ghost" size="sm" onClick={() => retryJob(job.id)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export { JobMonitoringPanel as default };
