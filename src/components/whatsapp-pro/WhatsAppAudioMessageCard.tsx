import { useState } from "react";
import { Mic, Loader2, Sparkles, CheckCircle2, AlertCircle, MessageSquareReply, ListPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAudioInsight, useTranscribeAndAnalyze, useAnalyzeAudio, type TranscriptionStatus } from "@/hooks/useWhatsAppAudioInsight";

interface WhatsAppAudioMessageCardProps {
  messageId: string;
  conversationId: string;
  mediaUrl?: string | null;
  durationSeconds?: number | null;
  isOutbound?: boolean;
  onUseSuggestedReply?: (text: string) => void;
  onCreateTask?: (title: string, description: string, priority: string | null) => void;
}

const STATUS_LABELS: Record<TranscriptionStatus, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending: { label: "Por transcrever", variant: "outline" },
  processing: { label: "A processar", variant: "secondary" },
  completed: { label: "Transcrito", variant: "default" },
  failed: { label: "Erro", variant: "destructive" },
  skipped: { label: "Ignorado", variant: "outline" },
};

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function WhatsAppAudioMessageCard({
  messageId,
  conversationId,
  mediaUrl,
  durationSeconds,
  isOutbound,
  onUseSuggestedReply,
  onCreateTask,
}: WhatsAppAudioMessageCardProps) {
  const { data: insight } = useAudioInsight(messageId);
  const transcribeAnalyze = useTranscribeAndAnalyze();
  const analyzeOnly = useAnalyzeAudio();
  const [expanded, setExpanded] = useState(false);

  const status: TranscriptionStatus = (insight?.transcription_status as TranscriptionStatus) ?? "pending";
  const statusMeta = STATUS_LABELS[status];
  const url = insight?.media_url ?? mediaUrl ?? null;
  const dur = insight?.duration_seconds ?? durationSeconds ?? null;
  const isProcessing = status === "processing" || transcribeAnalyze.isPending || analyzeOnly.isPending;

  const hasTranscript = !!insight?.transcription_text && status === "completed";
  const hasAnalysis = !!insight?.summary;

  return (
    <div className="space-y-2 min-w-[260px] max-w-[420px]">
      {/* Player */}
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-primary shrink-0" />
        {url ? (
          <audio controls preload="metadata" src={url} className="flex-1 h-9">
            <track kind="captions" />
          </audio>
        ) : (
          <span className="text-xs text-muted-foreground">Áudio sem URL</span>
        )}
        {dur != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {Math.floor(dur / 60)}:{String(dur % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Status + actions (apenas inbound — não faz sentido analisar áudio enviado por nós) */}
      {!isOutbound && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={statusMeta.variant} className="text-[10px]">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> A processar
              </span>
            ) : statusMeta.label}
          </Badge>
          {!hasTranscript && status !== "processing" && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1"
              disabled={!url || isProcessing}
              onClick={() => transcribeAnalyze.mutate({ messageId, mediaUrl: url ?? undefined, conversationId })}
            >
              <Sparkles className="w-3 h-3" />
              Transcrever e analisar
            </Button>
          )}
          {hasTranscript && !hasAnalysis && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={isProcessing}
              onClick={() => analyzeOnly.mutate({ messageId })}
            >
              <Sparkles className="w-3 h-3" />
              Gerar resumo IA
            </Button>
          )}
        </div>
      )}

      {/* Erro */}
      {status === "failed" && insight?.transcription_error && (
        <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded p-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Não foi possível transcrever este áudio.</p>
            <p className="opacity-80">{insight.transcription_error}</p>
          </div>
        </div>
      )}

      {/* Painel transcrição/resumo */}
      {(hasTranscript || hasAnalysis) && (
        <div className="border rounded-lg bg-background/60 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/40 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {hasAnalysis ? "Transcrição e resumo IA" : "Transcrição"}
            </span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="px-2.5 pb-2.5 space-y-3">
              {hasTranscript && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Transcrição</p>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{insight!.transcription_text}</p>
                </div>
              )}

              {hasAnalysis && insight && (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Resumo IA</p>
                    <p className="text-xs leading-relaxed">{insight.summary}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {insight.intent && (
                      <Badge variant="outline" className="text-[10px]">{labelIntent(insight.intent)}</Badge>
                    )}
                    {insight.sentiment && (
                      <Badge variant="outline" className="text-[10px]">{labelSentiment(insight.sentiment)}</Badge>
                    )}
                    {insight.urgency && (
                      <Badge className={cn("text-[10px] border", URGENCY_COLORS[insight.urgency])} variant="outline">
                        Urgência: {labelUrgency(insight.urgency)}
                      </Badge>
                    )}
                    {insight.confidence != null && (
                      <Badge variant="outline" className="text-[10px]">
                        Confiança: {Math.round(insight.confidence * 100)}%
                      </Badge>
                    )}
                  </div>

                  {insight.next_action && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Próxima ação</p>
                      <p className="text-xs leading-relaxed">{insight.next_action}</p>
                    </div>
                  )}

                  {insight.suggested_reply && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Resposta sugerida</p>
                      <p className="text-xs leading-relaxed bg-muted/60 rounded p-2">{insight.suggested_reply}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {onUseSuggestedReply && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => onUseSuggestedReply(insight.suggested_reply!)}
                          >
                            <MessageSquareReply className="w-3 h-3" />
                            Usar resposta sugerida
                          </Button>
                        )}
                        {onCreateTask && insight.suggested_task_title && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => onCreateTask(
                              insight.suggested_task_title!,
                              insight.suggested_task_description ?? insight.next_action ?? "",
                              insight.urgency,
                            )}
                          >
                            <ListPlus className="w-3 h-3" />
                            Criar tarefa
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {(insight.confidence ?? 0) < 0.4 && (
                    <p className="text-[10px] text-muted-foreground italic">
                      A transcrição foi concluída, mas a IA não encontrou contexto suficiente para sugerir uma ação com segurança.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function labelIntent(v: string) {
  const map: Record<string, string> = {
    sales_interest: "Interesse comercial",
    support_request: "Pedido de suporte",
    complaint: "Reclamação",
    appointment: "Marcação",
    price_question: "Questão de preço",
    product_question: "Questão de produto",
    follow_up: "Follow-up",
    other: "Outro",
  };
  return map[v] ?? v;
}
function labelSentiment(v: string) {
  const map: Record<string, string> = { positive: "Positivo", neutral: "Neutro", negative: "Negativo", urgent: "Urgente" };
  return map[v] ?? v;
}
function labelUrgency(v: string) {
  const map: Record<string, string> = { low: "baixa", medium: "média", high: "alta" };
  return map[v] ?? v;
}
