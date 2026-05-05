import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, Send, Target, Clock, AlertTriangle, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { useConversationAIAnalysis, useAnalyzeConversation, type ConversationAIAnalysis } from "@/hooks/useConversationAIAnalysis";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  conversationId: string | null;
  onInsertReply?: (text: string) => void;
  onCreateOpportunity?: () => void;
  onScheduleFollowup?: () => void;
}

const INTENT_LABEL: Record<ConversationAIAnalysis["intent"], string> = {
  price_request: "Pediu preço",
  meeting_request: "Quer reunir",
  support: "Suporte",
  complaint: "Reclamação",
  buying_signal: "Sinal de compra",
  objection: "Objeção",
  unknown: "—",
};

const TEMP_LABEL: Record<ConversationAIAnalysis["lead_temperature"], { label: string; cls: string }> = {
  cold: { label: "Frio", cls: "bg-slate-200 text-slate-700" },
  warm: { label: "Morno", cls: "bg-amber-100 text-amber-700" },
  hot: { label: "Quente 🔥", cls: "bg-orange-500 text-white" },
  proposal_ready: { label: "Pronto para proposta", cls: "bg-emerald-500 text-white" },
};

const URGENCY_LABEL: Record<ConversationAIAnalysis["urgency"], { label: string; cls: string }> = {
  low: { label: "Baixa", cls: "border-slate-300 text-slate-600" },
  medium: { label: "Média", cls: "border-amber-400 text-amber-700" },
  high: { label: "Alta", cls: "border-red-400 text-red-700" },
};

function SentimentIcon({ s }: { s: ConversationAIAnalysis["sentiment"] }) {
  if (s === "positive") return <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (s === "negative") return <ThumbsDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function ConversationAIAnalysisPanel({ conversationId, onInsertReply, onCreateOpportunity, onScheduleFollowup }: Props) {
  const { data, isLoading } = useConversationAIAnalysis(conversationId);
  const analyze = useAnalyzeConversation();

  const analysis = data?.ai_analysis_json as ConversationAIAnalysis | null;
  const updatedAt = data?.ai_analysis_at;

  if (!conversationId) return null;

  if (isLoading) {
    return (
      <Card className="p-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A carregar análise IA...
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-3 mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Análise IA</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ainda não foi gerada uma análise para esta conversa.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => analyze.mutate({ conversationId, force: true })}
          disabled={analyze.isPending}
        >
          {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Analisar agora
        </Button>
      </Card>
    );
  }

  const temp = TEMP_LABEL[analysis.lead_temperature];
  const urg = URGENCY_LABEL[analysis.urgency];

  return (
    <Card className="p-3 mb-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Análise IA</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => analyze.mutate({ conversationId, force: true })}
          disabled={analyze.isPending}
          title="Reanalisar"
        >
          {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge className={temp.cls + " border-0"}>{temp.label}</Badge>
        <Badge variant="outline" className={urg.cls}>
          <Clock className="h-3 w-3 mr-1" />
          {urg.label}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <SentimentIcon s={analysis.sentiment} />
          {analysis.sentiment === "positive" ? "Positivo" : analysis.sentiment === "negative" ? "Negativo" : "Neutro"}
        </Badge>
        <Badge variant="secondary" className="text-xs">{INTENT_LABEL[analysis.intent]}</Badge>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Resumo</p>
        <p className="text-sm">{analysis.summary}</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Próxima ação</p>
        <p className="text-sm">{analysis.recommended_action}</p>
      </div>

      {analysis.main_objection && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-0.5">
            <AlertTriangle className="h-3 w-3" />
            Objeção principal
          </div>
          <p className="text-xs text-amber-900">{analysis.main_objection}</p>
        </div>
      )}

      <div className="bg-muted/50 rounded p-2 space-y-2">
        <p className="text-xs text-muted-foreground">Resposta sugerida</p>
        <p className="text-sm leading-relaxed">{analysis.suggested_reply}</p>
        {onInsertReply && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => onInsertReply(analysis.suggested_reply)}
          >
            <Send className="h-3.5 w-3.5" />
            Usar esta resposta
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {analysis.should_create_opportunity && onCreateOpportunity && (
          <Button size="sm" variant="default" className="flex-1 gap-1.5" onClick={onCreateOpportunity}>
            <Target className="h-3.5 w-3.5" />
            Criar oportunidade
          </Button>
        )}
        {onScheduleFollowup && (
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onScheduleFollowup}>
            <Clock className="h-3.5 w-3.5" />
            Follow-up
          </Button>
        )}
      </div>

      {analysis.suggested_followup && (
        <p className="text-xs text-muted-foreground italic">💡 {analysis.suggested_followup}</p>
      )}

      {updatedAt && (
        <p className="text-[10px] text-muted-foreground text-right">
          Atualizado {formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: pt })}
        </p>
      )}
    </Card>
  );
}
