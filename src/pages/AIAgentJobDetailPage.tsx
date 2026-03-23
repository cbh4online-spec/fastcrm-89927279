import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Cpu, Brain, Zap, CheckCircle, XCircle, Target, AlertTriangle,
  Clock, Loader2, MessageSquare
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAgentJob } from "@/hooks/useAIAgentJobs";
import { useAIAgentExecutions } from "@/hooks/useAIAgentExecutions";
import type { AgentStepType } from "@/types/ai-agents";

const stepIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  plan: { icon: <Brain className="h-4 w-4" />, color: "text-amber-500 bg-amber-500/10" },
  tool_call: { icon: <Zap className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10" },
  tool_result: { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-500 bg-green-500/10" },
  reasoning: { icon: <MessageSquare className="h-4 w-4" />, color: "text-muted-foreground bg-muted" },
  output: { icon: <Target className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10" },
  error: { icon: <XCircle className="h-4 w-4" />, color: "text-red-500 bg-red-500/10" },
};

export default function AIAgentJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading: jobLoading } = useAgentJob(id);
  const { data: executions, isLoading: execLoading } = useAIAgentExecutions(id);

  const isRunning = ['pending', 'queued', 'running'].includes(job?.status ?? '');

  if (jobLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p>Job não encontrado</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/ai-agents')}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    running: "bg-emerald-500/10 text-emerald-600",
    completed: "bg-green-500/10 text-green-600",
    failed: "bg-red-500/10 text-red-600",
    timeout: "bg-amber-500/10 text-amber-600",
    cancelled: "bg-gray-500/10 text-gray-600",
  };

  const duration = job.completed_at && job.started_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/ai-agents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              {job.name || job.task?.substring(0, 60) || job.agent_type}
            </h1>
          </div>
          <Badge className={`${statusColors[job.status] || ''} text-sm`}>
            {job.status === 'running' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {job.status}
          </Badge>
        </div>

        {/* Meta Bar */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Brain className="h-3.5 w-3.5" />{job.agent_type}</span>
          <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />P{job.priority}</span>
          {duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{duration}s</span>}
          <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}</span>
        </div>

        {/* Result Summary */}
        {job.status === 'completed' && job.result_summary && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{job.result_summary}</p>
              {job.result_data && Object.keys(job.result_data).length > 0 && (
                <pre className="mt-3 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                  {JSON.stringify(job.result_data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {['failed', 'timeout'].includes(job.status) && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Erro {job.error_code && `(${job.error_code})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{job.error_message || 'Erro desconhecido'}</p>
            </CardContent>
          </Card>
        )}

        {/* Execution Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Timeline de Execução
              {isRunning && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {execLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : !executions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {isRunning ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Aguardar próximo passo...</p>
                  </div>
                ) : (
                  <p className="text-sm">Sem passos de execução.</p>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-1">
                  {executions.map((step, idx) => {
                    const stepType = (step.step_type || 'reasoning') as AgentStepType;
                    const cfg = stepIcons[stepType] || stepIcons.reasoning;
                    const hasError = stepType === 'tool_result' && step.tool_error;

                    return (
                      <div key={step.id} className="flex gap-3 py-2 border-b border-border/30 last:border-0">
                        <div className={`p-1.5 rounded-lg shrink-0 h-fit ${hasError ? 'text-red-500 bg-red-500/10' : cfg.color}`}>
                          {hasError ? <XCircle className="h-4 w-4" /> : cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {stepType === 'tool_call' ? `⚡ ${step.tool_name}` : stepType}
                            </span>
                            {step.step_number && <span className="text-xs text-muted-foreground">#{step.step_number}</span>}
                            {step.duration_ms && <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>}
                          </div>
                          {step.content && (
                            <p className="text-sm whitespace-pre-wrap break-words">{step.content}</p>
                          )}
                          {stepType === 'tool_call' && step.tool_input && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Input JSON</summary>
                              <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(step.tool_input, null, 2)}</pre>
                            </details>
                          )}
                          {stepType === 'tool_result' && step.tool_output && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Output JSON</summary>
                              <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(step.tool_output, null, 2)}</pre>
                            </details>
                          )}
                          {step.tool_error && (
                            <p className="text-xs text-red-500">{step.tool_error}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isRunning && (
                    <div className="flex items-center gap-2 py-3 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Aguardar próximo passo...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
