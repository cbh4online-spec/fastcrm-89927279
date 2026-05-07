/**
 * VoiceCallDetailDialog — Fase 1Q.3
 * Detalhe completo de uma chamada: playback, transcrição segmentada,
 * resumo IA, sentimento, qualidade, compliance, próximas ações.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sparkles, FileAudio, ShieldAlert, ShieldCheck, RefreshCw, Upload, Loader2,
} from "lucide-react";
import {
  useVoiceCallDetail, useVoiceCallSegments, useTranscribeCall, useAnalyzeCall,
  useUploadRecording, useRecordingPlaybackUrl,
} from "@/hooks/useVoiceHub";
import { format } from "date-fns";

function formatTs(s?: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function sentimentColor(s?: string | null) {
  if (s === "positive") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "negative") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

interface Props {
  callId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function VoiceCallDetailDialog({ callId, open, onOpenChange }: Props) {
  const { data: call, isLoading } = useVoiceCallDetail(callId ?? undefined);
  const { data: segments = [] } = useVoiceCallSegments(callId ?? undefined);
  const transcribe = useTranscribeCall();
  const analyze = useAnalyzeCall();
  const upload = useUploadRecording();
  const playback = useRecordingPlaybackUrl();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    setAudioUrl(null);
    if (open && call?.recording_storage_path && callId) {
      playback.mutateAsync(callId).then((u) => setAudioUrl(u)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, callId, call?.recording_storage_path]);

  if (!call) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chamada</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{isLoading ? "A carregar..." : "Não encontrada."}</p>
        </DialogContent>
      </Dialog>
    );
  }

  const transcribing = call.transcription_status === "processing";
  const hasTranscription = !!call.transcription_text;
  const hasIntelligence = !!call.ai_summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-primary" />
            Chamada — {call.to_number || call.from_number || "—"}
            <Badge variant="outline">{call.call_direction}</Badge>
            {call.compliance_review_required && (
              <Badge variant="destructive" className="ml-2">
                <ShieldAlert className="h-3 w-3 mr-1" />Revisão
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Playback */}
          <div className="rounded-lg border p-3 bg-muted/30">
            {audioUrl ? (
              <audio controls className="w-full" src={audioUrl} />
            ) : call.recording_storage_path ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />A preparar gravação...
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Sem gravação. Carregue um ficheiro de áudio para transcrever.</p>
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && callId) upload.mutate({ callLogId: callId, file: f });
                    }}
                  />
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="h-4 w-4 mr-2" />Carregar áudio</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Acções IA */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!call.recording_storage_path || transcribing || transcribe.isPending}
              onClick={() => callId && transcribe.mutate(callId)}
            >
              {transcribe.isPending || transcribing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {hasTranscription ? "Re-transcrever" : "Transcrever"}
            </Button>
            <Button
              size="sm"
              disabled={!hasTranscription || analyze.isPending}
              onClick={() => callId && analyze.mutate(callId)}
            >
              {analyze.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {hasIntelligence ? "Re-analisar" : "Analisar com IA"}
            </Button>
            {call.ai_sentiment && (
              <Badge className={sentimentColor(call.ai_sentiment)}>{call.ai_sentiment}</Badge>
            )}
            {call.quality_score != null && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Qualidade</span>
                <Progress value={call.quality_score} className="w-32 h-2" />
                <span className="text-sm font-semibold tabular-nums">{call.quality_score}/100</span>
              </div>
            )}
          </div>

          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="transcript">Transcrição</TabsTrigger>
              <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
              <TabsTrigger value="compliance">Conformidade</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-3 mt-3">
              {call.ai_summary ? (
                <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">{call.ai_summary}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem resumo. Execute "Analisar com IA".</p>
              )}
              {call.next_actions && call.next_actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Próximas ações</h4>
                  <ul className="space-y-1">
                    {call.next_actions.map((a: any, i: number) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{a.priority || "medium"}</Badge>
                        <span>{a.action}</span>
                        {a.due_in_days != null && (
                          <span className="text-xs text-muted-foreground">em {a.due_in_days}d</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-3">
              <ScrollArea className="h-[40vh] rounded-md border p-3">
                {segments.length > 0 ? (
                  <div className="space-y-2">
                    {segments.map((s) => (
                      <div key={s.id} className="text-sm">
                        <span className="text-xs text-muted-foreground tabular-nums mr-2">
                          [{formatTs(s.start_seconds)}]
                        </span>
                        {s.speaker && (
                          <Badge variant="outline" className="text-xs mr-2">
                            {s.speaker === "agent" ? "Agente" : s.speaker === "customer" ? "Cliente" : s.speaker}
                          </Badge>
                        )}
                        <span>{s.text}</span>
                      </div>
                    ))}
                  </div>
                ) : call.transcription_text ? (
                  <div className="text-sm whitespace-pre-wrap">{call.transcription_text}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem transcrição.</p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="intelligence" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">Tópicos</h4>
                  <div className="flex flex-wrap gap-1">
                    {(call.topics || []).map((t: string, i: number) => (
                      <Badge key={i} variant="secondary">{t}</Badge>
                    ))}
                    {(!call.topics || call.topics.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">Objeções</h4>
                  <div className="flex flex-wrap gap-1">
                    {(call.objections || []).map((t: string, i: number) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                    {(!call.objections || call.objections.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {(call.keywords || []).map((t: string, i: number) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                    {(!call.keywords || call.keywords.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
              {call.quality_breakdown && Object.keys(call.quality_breakdown).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">Score breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(call.quality_breakdown).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <span className="w-40 capitalize">{k.replace(/_/g, " ")}</span>
                        <Progress value={Number(v) || 0} className="flex-1 h-2" />
                        <span className="w-10 text-right tabular-nums">{Number(v) || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-3 mt-3">
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {call.compliance_consent_detected ? (
                    <><ShieldCheck className="h-4 w-4 text-emerald-600" /> Consentimento de gravação detectado</>
                  ) : call.compliance_consent_detected === false ? (
                    <><ShieldAlert className="h-4 w-4 text-red-600" /> Consentimento NÃO detetado</>
                  ) : (
                    <span className="text-muted-foreground">Consentimento — sem análise</span>
                  )}
                </div>
                {call.compliance_forbidden_hits && call.compliance_forbidden_hits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-1">Palavras proibidas detetadas</p>
                    <div className="flex flex-wrap gap-1">
                      {call.compliance_forbidden_hits.map((p: string, i: number) => (
                        <Badge key={i} variant="destructive">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {call.compliance_required_missing && call.compliance_required_missing.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 mb-1">Frases obrigatórias em falta</p>
                    <div className="flex flex-wrap gap-1">
                      {call.compliance_required_missing.map((p: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-amber-500 text-amber-700">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {call.intelligence_completed_at && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Análise: {format(new Date(call.intelligence_completed_at), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
