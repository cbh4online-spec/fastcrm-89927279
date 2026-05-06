import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, MessageCircle, ExternalLink } from "lucide-react";
import { useReplyTicketWhatsApp, useTriageTicket, useSupportTicketEvents } from "@/hooks/useSupportTickets";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Props {
  ticketId: string;
  conversationId: string | null;
  aiSummary: string | null;
  aiRecommendation: Record<string, any> | null;
}

export function TicketWhatsAppPanel({ ticketId, conversationId, aiSummary, aiRecommendation }: Props) {
  const [reply, setReply] = useState("");
  const triage = useTriageTicket();
  const sendReply = useReplyTicketWhatsApp();
  const { data: events = [] } = useSupportTicketEvents(ticketId);

  const recommendedReply = aiRecommendation?.recommended_response as string | undefined;
  const steps = (aiRecommendation?.resolution_steps as string[] | undefined) ?? [];
  const escalationRisk = aiRecommendation?.escalation_risk as string | undefined;

  const onTriage = () => triage.mutate(ticketId);
  const onSend = () => {
    if (!reply.trim()) return;
    sendReply.mutate({ ticket_id: ticketId, message: reply.trim() }, {
      onSuccess: (data) => { if (data?.ok) setReply(""); },
    });
  };

  return (
    <div className="space-y-3">
      {/* Triage / AI Recommendation */}
      <Card className="p-3 space-y-3 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Triagem IA
          </div>
          <Button size="sm" variant="outline" onClick={onTriage} disabled={triage.isPending}>
            {triage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Analisar"}
          </Button>
        </div>

        {aiSummary && (
          <p className="text-xs text-muted-foreground">{aiSummary}</p>
        )}

        {steps.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Passos de resolução</div>
            <ul className="text-xs space-y-0.5 list-decimal pl-4 text-muted-foreground">
              {steps.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {escalationRisk && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Risco de escalamento:</span>
            <Badge
              variant={escalationRisk === "high" ? "destructive" : escalationRisk === "medium" ? "secondary" : "outline"}
              className="text-[10px]"
            >
              {escalationRisk}
            </Badge>
          </div>
        )}

        {!aiSummary && !steps.length && (
          <p className="text-xs text-muted-foreground italic">
            Clique em "Analisar" para gerar resumo, prioridade sugerida, resposta e passos de resolução.
          </p>
        )}
      </Card>

      {/* WhatsApp reply */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="w-4 h-4 text-green-600" />
            Responder por WhatsApp
          </div>
          {conversationId && (
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Link to={`/dashboard/inbox?conversation=${conversationId}`}>
                Abrir conversa <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>

        {!conversationId && (
          <p className="text-xs text-amber-600 bg-amber-500/10 rounded px-2 py-1">
            Sem conversa associada — não é possível responder por WhatsApp.
          </p>
        )}

        {recommendedReply && (
          <div className="rounded-md border border-dashed p-2 text-xs space-y-1.5">
            <div className="text-muted-foreground">Resposta sugerida:</div>
            <p className="text-foreground">{recommendedReply}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px]"
              onClick={() => setReply(recommendedReply)}
            >
              Usar
            </Button>
          </div>
        )}

        <Textarea
          placeholder={conversationId ? "Escreva a resposta para o cliente…" : "Sem conversa para responder"}
          value={reply}
          onChange={(e) => setReply(e.target.value.slice(0, 4000))}
          rows={4}
          disabled={!conversationId}
        />
        <Button onClick={onSend} disabled={!conversationId || !reply.trim() || sendReply.isPending} className="w-full gap-1.5">
          {sendReply.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Enviar por WhatsApp
        </Button>
      </Card>

      {/* Timeline */}
      {events.length > 0 && (
        <Card className="p-3 space-y-2">
          <div className="text-sm font-medium">Eventos do ticket</div>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {events.slice(0, 10).map((ev) => (
              <li key={ev.id} className="text-[11px] text-muted-foreground flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] shrink-0 capitalize">
                  {ev.event_type.replace(/^support\.ticket\./, "").replace(/_/g, " ")}
                </Badge>
                <span className="flex-1 line-clamp-2">{ev.description ?? "—"}</span>
                <span className="shrink-0">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: pt })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
