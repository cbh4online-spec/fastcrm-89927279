import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCampaignSendQueue } from '@/hooks/useCampaignSendQueue';
import {
  Send,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';

interface CampaignQueueStatusProps {
  campaignId: string;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export function CampaignQueueStatus({
  campaignId,
  isPaused,
  onPause,
  onResume,
}: CampaignQueueStatusProps) {
  const { queueStatus, progressPercentage, isLoading } = useCampaignSendQueue(campaignId);

  if (isLoading || !queueStatus || queueStatus.total === 0) return null;

  const isComplete = queueStatus.pending === 0 && queueStatus.sending === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            {isComplete ? 'Envio Concluído' : 'Envio em Curso'}
          </CardTitle>
          {!isComplete && (
            <div className="flex items-center gap-1">
              {isPaused ? (
                <Button variant="ghost" size="sm" onClick={onResume} className="h-7 text-xs">
                  <Play className="h-3 w-3 mr-1" />
                  Retomar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onPause} className="h-7 text-xs">
                  <Pause className="h-3 w-3 mr-1" />
                  Pausar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressPercentage}% concluído</span>
            <span>
              {queueStatus.sent} / {queueStatus.total}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border p-2 text-center">
            <CheckCircle2 className="h-3.5 w-3.5 mx-auto mb-0.5 text-emerald-600" />
            <p className="text-sm font-bold tabular-nums">{queueStatus.sent}</p>
            <p className="text-[10px] text-muted-foreground">Enviados</p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <Clock className="h-3.5 w-3.5 mx-auto mb-0.5 text-blue-500" />
            <p className="text-sm font-bold tabular-nums">{queueStatus.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            {queueStatus.sending > 0 ? (
              <Loader2 className="h-3.5 w-3.5 mx-auto mb-0.5 text-amber-500 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mx-auto mb-0.5 text-amber-500" />
            )}
            <p className="text-sm font-bold tabular-nums">{queueStatus.sending}</p>
            <p className="text-[10px] text-muted-foreground">A enviar</p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <AlertTriangle className="h-3.5 w-3.5 mx-auto mb-0.5 text-destructive" />
            <p className="text-sm font-bold tabular-nums">{queueStatus.failed}</p>
            <p className="text-[10px] text-muted-foreground">Falhados</p>
          </div>
        </div>

        {/* Paused indicator */}
        {isPaused && !isComplete && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <Pause className="h-3.5 w-3.5 shrink-0" />
            <span>Envio pausado — novos lotes não serão processados</span>
          </div>
        )}

        {/* Completion message */}
        {isComplete && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              Todos os emails foram processados
              {queueStatus.failed > 0 && ` (${queueStatus.failed} falharam)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
