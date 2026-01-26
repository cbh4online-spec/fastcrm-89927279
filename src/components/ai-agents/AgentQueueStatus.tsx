import { Clock, Play, CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentLifecycle } from "@/hooks/useAgentLifecycle";
import { useAgentAnalysis } from "@/hooks/useAgentAnalysis";
import { getStatusColor, getStatusLabel } from "@/types/agentLifecycle";
import type { AgentType } from "@/types/aiAgents";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface AgentQueueStatusProps {
  entityId: string;
  entityType: string;
  agentType?: AgentType;
  showAnalyzeButton?: boolean;
  compact?: boolean;
}

export function AgentQueueStatus({
  entityId,
  entityType,
  agentType,
  showAnalyzeButton = true,
  compact = false,
}: AgentQueueStatusProps) {
  const agent = agentType || (entityType as AgentType);
  
  const {
    pendingJobs,
    runningJobs,
    canDispatch,
    isDispatching,
    dispatch,
    cancel,
  } = useAgentLifecycle({
    entityId,
    entityType,
    agentType: agent,
  });

  const { lastAnalysis, isLoadingLast } = useAgentAnalysis(
    agent,
    entityId,
    entityType
  );

  const handleAnalyze = async () => {
    await dispatch('manual');
  };

  const hasActiveJob = pendingJobs.length > 0 || runningJobs.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {runningJobs.length > 0 && (
          <Badge variant="outline" className="gap-1 text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            A analisar...
          </Badge>
        )}
        {pendingJobs.length > 0 && (
          <Badge variant="outline" className="gap-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            Na fila ({pendingJobs.length})
          </Badge>
        )}
        {showAnalyzeButton && !hasActiveJob && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={!canDispatch || isDispatching}
          >
            {isDispatching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="ml-1">Analisar</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Estado da Análise IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Running Jobs */}
        {runningJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                A executar análise...
              </span>
            </div>
          </div>
        ))}

        {/* Pending Jobs */}
        {pendingJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <span className="text-sm font-medium text-yellow-900">
                  Aguardando na fila
                </span>
                <p className="text-xs text-yellow-700">
                  Tentativa {job.attempts + 1}/{job.maxAttempts}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancel(job.id)}
              className="text-yellow-700 hover:text-yellow-900"
            >
              Cancelar
            </Button>
          </div>
        ))}

        {/* Last Analysis Result */}
        {!hasActiveJob && lastAnalysis && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Última análise</span>
              <Badge
                variant={lastAnalysis.success ? "default" : "destructive"}
                className="text-xs"
              >
                {lastAnalysis.success ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Sucesso
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Falhou
                  </>
                )}
              </Badge>
            </div>
            {lastAnalysis.output?.executiveSummary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {lastAnalysis.output.executiveSummary}
              </p>
            )}
          </div>
        )}

        {/* No Analysis Yet */}
        {!hasActiveJob && !lastAnalysis && !isLoadingLast && (
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma análise realizada ainda
            </p>
          </div>
        )}

        {/* Analyze Button */}
        {showAnalyzeButton && (
          <Button
            className="w-full"
            onClick={handleAnalyze}
            disabled={!canDispatch || isDispatching}
          >
            {isDispatching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                A agendar...
              </>
            ) : hasActiveJob ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Análise em curso
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analisar agora
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
