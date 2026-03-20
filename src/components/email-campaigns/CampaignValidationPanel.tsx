import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Send,
  Pause,
  Play,
} from 'lucide-react';
import { useCampaignValidation } from '@/hooks/useCampaignValidation';
import { useCampaignSendQueue } from '@/hooks/useCampaignSendQueue';

interface CampaignValidationPanelProps {
  campaignId: string;
  recipientCount: number;
  validationRunAt?: string | null;
  validatedCount?: number;
  invalidCount?: number;
  suppressedCount?: number;
  sendMode?: string;
  batchSize?: number;
  batchIntervalMinutes?: number;
  onSendModeChange?: (mode: string) => void;
  onBatchSizeChange?: (size: number) => void;
  onBatchIntervalChange?: (minutes: number) => void;
  onValidated?: () => void;
  onSend?: () => void;
  isSending?: boolean;
}

export function CampaignValidationPanel({
  campaignId,
  recipientCount,
  validationRunAt,
  validatedCount = 0,
  invalidCount = 0,
  suppressedCount = 0,
  sendMode = 'immediate',
  batchSize = 100,
  batchIntervalMinutes = 60,
  onSendModeChange,
  onBatchSizeChange,
  onBatchIntervalChange,
  onValidated,
  onSend,
  isSending,
}: CampaignValidationPanelProps) {
  const { validate, isValidating } = useCampaignValidation(campaignId);
  const { queueStats, pauseQueue, resumeQueue } = useCampaignSendQueue(campaignId);
  const [showDetails, setShowDetails] = useState(false);

  const isValidated = !!validationRunAt;
  const validRecipients = validatedCount;
  const totalBatches = sendMode === 'throttled' ? Math.ceil(recipientCount / batchSize) : 1;
  const estimatedMinutes = sendMode === 'throttled' ? (totalBatches - 1) * batchIntervalMinutes : 0;

  const handleValidate = async () => {
    try {
      await validate.mutateAsync();
      onValidated?.();
    } catch {
      // error handled by mutation
    }
  };

  // Queue progress view
  if (queueStatus && queueStatus.total > 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Progresso de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercentage} className="h-2" />
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Enviados</p>
              <p className="font-semibold">{queueStatus.sent}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pendentes</p>
              <p className="font-semibold">{queueStatus.pending}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Falhados</p>
              <p className="font-semibold">{queueStatus.failed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">{queueStatus.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Validation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Validação de Lista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isValidated ? (
            <>
              <p className="text-sm text-muted-foreground">
                Lista por validar — {recipientCount} destinatários
              </p>
              <Button onClick={handleValidate} disabled={isValidating} className="w-full">
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A validar...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Validar agora
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-400">
                    {validRecipients} emails válidos prontos a enviar
                  </span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400">
                      {invalidCount} emails inválidos removidos
                    </span>
                  </div>
                )}
                {suppressedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700 dark:text-red-400">
                      {suppressedCount} endereços na lista de supressão
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Ver detalhes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating}
              >
                {isValidating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Revalidar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Mode Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Modo de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar modo</Label>
            <Select value={sendMode} onValueChange={(v) => onSendModeChange?.(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3" />
                    Imediato (todos de uma vez)
                  </div>
                </SelectItem>
                <SelectItem value="throttled">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Por lotes
                  </div>
                </SelectItem>
                <SelectItem value="optimal_time" disabled>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    Horário ideal por contacto (Em breve)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sendMode === 'throttled' && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Tamanho do lote: {batchSize}</Label>
                  <Slider
                    value={[batchSize]}
                    onValueChange={([v]) => onBatchSizeChange?.(v)}
                    min={50}
                    max={500}
                    step={50}
                  />
                  <p className="text-xs text-muted-foreground">50 a 500 emails por lote</p>
                </div>
                <div className="space-y-2">
                  <Label>Intervalo entre lotes</Label>
                  <Select
                    value={String(batchIntervalMinutes)}
                    onValueChange={(v) => onBatchIntervalChange?.(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                      <SelectItem value="240">4 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">Estimativa de envio</p>
                  <p className="text-muted-foreground">
                    {totalBatches} lotes • Envio completo em{' '}
                    {estimatedMinutes < 60
                      ? `${estimatedMinutes} minutos`
                      : `${Math.round(estimatedMinutes / 60)} horas`}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!isValidated || validRecipients === 0 || isSending}
        onClick={onSend}
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            A enviar...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Enviar campanha ({validRecipients} destinatários)
          </>
        )}
      </Button>
      {!isValidated && (
        <p className="text-xs text-center text-muted-foreground">
          Valide a lista antes de enviar
        </p>
      )}
    </div>
  );
}
