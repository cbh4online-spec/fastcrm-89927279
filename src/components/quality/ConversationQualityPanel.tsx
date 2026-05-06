import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, AlertTriangle, Target, Loader2, Copy, BookmarkPlus, ListTodo } from "lucide-react";
import {
  useLatestQualityReview,
  useAnalyzeConversationQuality,
  useAddObjection,
  useCreateCoachingTask,
  type QualityReview,
} from "@/hooks/useConversationQuality";
import { toast } from "sonner";

interface Props {
  conversationId?: string;
  ticketId?: string;
  agentId?: string | null;
}

export function ConversationQualityPanel({ conversationId, ticketId, agentId }: Props) {
  const { data: review, isLoading } = useLatestQualityReview({ conversationId, ticketId });
  const analyze = useAnalyzeConversationQuality();
  const addObjection = useAddObjection();
  const createTask = useCreateCoachingTask();
  const [showAll, setShowAll] = useState(false);

  const handleAnalyze = () => {
    analyze.mutate({
      conversationId,
      ticketId,
      agentId: agentId ?? null,
      reviewType: ticketId ? "ticket" : "conversation",
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Qualidade da Conversa
          </h3>
          <p className="text-xs text-muted-foreground">
            Análise IA construtiva — apoio à melhoria, não avaliação isolada.
          </p>
        </div>
        <Button size="sm" onClick={handleAnalyze} disabled={analyze.isPending}>
          {analyze.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {review ? "Reanalisar" : "Analisar qualidade"}
        </Button>
      </div>

      {isLoading && <div className="text-xs text-muted-foreground">A carregar…</div>}

      {!isLoading && !review && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ainda não existe análise de qualidade. Clique em "Analisar qualidade" para gerar uma.
        </div>
      )}

      {review && <QualityReviewCard review={review} onAddObjection={(o) => addObjection.mutate(o)} onCreateTask={(t) => createTask.mutate(t)} agentId={agentId ?? null} showAll={showAll} setShowAll={setShowAll} />}
    </Card>
  );
}

function QualityReviewCard({
  review,
  onAddObjection,
  onCreateTask,
  agentId,
  showAll,
  setShowAll,
}: {
  review: QualityReview;
  onAddObjection: (o: any) => void;
  onCreateTask: (t: any) => void;
  agentId: string | null;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
}) {
  const score = review.overall_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-rose-600";

  const subscores: Array<[string, number | null]> = [
    ["Clareza", review.clarity_score],
    ["Empatia", review.empathy_score],
    ["Comercial", review.commercial_score],
    ["Resolução", review.resolution_score],
    ["Follow-up", review.followup_score],
    ["Objeções", review.objection_handling_score],
    ["Profissional.", review.professionalism_score],
    ["Contexto", review.speed_context_score],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-4">
        <div className={`text-4xl font-bold ${scoreColor}`}>{Math.round(score)}</div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Score geral de qualidade</div>
          <Progress value={score} className="h-1.5 mt-1" />
        </div>
        {(review.compliance_risk_score ?? 0) >= 50 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Risco
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {subscores.map(([label, val]) => (
          <div key={label} className="rounded border p-2">
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="text-sm font-semibold">{val ?? "—"}</div>
            <Progress value={val ?? 0} className="h-1 mt-1" />
          </div>
        ))}
      </div>

      {review.strengths?.length > 0 && (
        <Section icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} title="Pontos fortes">
          {review.strengths.slice(0, showAll ? undefined : 3).map((s, i) => (
            <div key={i} className="rounded border p-2 text-sm">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
          ))}
        </Section>
      )}

      {review.improvement_points?.length > 0 && (
        <Section icon={<Target className="h-4 w-4 text-amber-600" />} title="Pontos a melhorar">
          {review.improvement_points.slice(0, showAll ? undefined : 3).map((p, i) => (
            <div key={i} className="rounded border p-2 text-sm space-y-1">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.description}</div>
              {p.suggestion && (
                <div className="text-xs bg-muted p-1.5 rounded">💡 {p.suggestion}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {review.objections_detected?.length > 0 && (
        <Section icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} title="Objeções detetadas">
          {review.objections_detected.map((o, i) => (
            <div key={i} className="rounded border p-2 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{o.objection_type}</Badge>
                <Badge variant={o.was_handled ? "default" : "destructive"} className="text-[10px]">
                  {o.was_handled ? "Tratada" : "Não tratada"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground italic">"{o.customer_signal}"</div>
              {o.better_response && <div className="text-xs bg-muted p-1.5 rounded">💬 {o.better_response}</div>}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px]"
                onClick={() =>
                  onAddObjection({
                    objection_type: o.objection_type,
                    title: o.objection_type,
                    real_example: o.customer_signal,
                    improved_response: o.better_response,
                    source_conversation_id: review.conversation_id,
                  })
                }
              >
                <BookmarkPlus className="h-3 w-3 mr-1" /> Guardar na biblioteca
              </Button>
            </div>
          ))}
        </Section>
      )}

      {review.improved_reply_example && (
        <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
          <div className="text-xs font-semibold">Exemplo de resposta melhorada</div>
          <div className="text-sm whitespace-pre-wrap">{review.improved_reply_example}</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(review.improved_reply_example!);
              toast.success("Copiado");
            }}
          >
            <Copy className="h-3 w-3 mr-1" /> Copiar
          </Button>
        </div>
      )}

      {review.coaching_note && (
        <div className="rounded border-l-4 border-primary bg-muted/30 p-3 text-sm">
          <div className="text-xs font-semibold mb-1">Nota de coaching</div>
          {review.coaching_note}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-[10px] text-muted-foreground italic">
          Esta análise é uma sugestão IA. Apoio à melhoria, não avaliação isolada.
        </p>
        <div className="flex gap-2">
          {(review.improvement_points?.length ?? 0) > 3 && (
            <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Mostrar menos" : "Ver tudo"}
            </Button>
          )}
          {agentId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onCreateTask({
                  agentId,
                  title: review.improvement_points?.[0]?.title ?? "Melhoria de atendimento",
                  description: review.coaching_note ?? "Tarefa criada a partir de análise de qualidade.",
                  sourceReviewId: review.id,
                })
              }
            >
              <ListTodo className="h-3 w-3 mr-1" /> Criar tarefa de coaching
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {icon} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
