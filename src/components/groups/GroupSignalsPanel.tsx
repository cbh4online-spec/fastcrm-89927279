/**
 * GroupSignalsPanel - Conversation signals adapted for group context
 */

import { useConversationSignals } from "@/hooks/useConversationSignals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Thermometer,
  Target,
  Shield,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Clock,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useState } from "react";

interface GroupSignalsPanelProps {
  groupId: string;
}

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cold: { label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10" },
  evaluating: { label: "A Avaliar", color: "text-amber-500", bg: "bg-amber-500/10" },
  ready_to_buy: { label: "Pronto p/ Comprar", color: "text-green-500", bg: "bg-green-500/10" },
  stalling: { label: "A Adiar", color: "text-orange-500", bg: "bg-orange-500/10" },
  lost: { label: "Perdido", color: "text-red-500", bg: "bg-red-500/10" },
};

const OBJECTION_LABELS: Record<string, string> = {
  price: "Preço",
  timing: "Timing",
  authority: "Autoridade",
  competitor: "Concorrência",
  uncertainty: "Incerteza",
  no_need: "Sem necessidade",
  confusion: "Confusão",
  none: "Nenhuma",
};

export function GroupSignalsPanel({ groupId }: GroupSignalsPanelProps) {
  // Use groupId as a pseudo-contactId for signals lookup
  const { signals, isLoading, recompute, lastUpdated } = useConversationSignals(undefined, undefined, groupId);
  const [recomputing, setRecomputing] = useState(false);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recompute();
    } finally {
      setRecomputing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!signals) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="p-3 rounded-full bg-muted">
          <Target className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Sem sinais disponíveis</p>
          <p className="text-xs text-muted-foreground mt-1">
            Calcule os sinais da conversa para obter insights
          </p>
        </div>
        <Button size="sm" onClick={handleRecompute} disabled={recomputing}>
          {recomputing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Calcular Sinais
        </Button>
      </div>
    );
  }

  const tempConfig = signals.temperature ? TEMPERATURE_CONFIG[signals.temperature] : null;

  return (
    <div className="space-y-4 p-1">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {lastUpdated
              ? `Atualizado ${formatDistanceToNow(lastUpdated, { addSuffix: true, locale: pt })}`
              : "Nunca atualizado"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRecompute} disabled={recomputing}>
          {recomputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Temperature */}
      {tempConfig && (
        <div className={cn("flex items-center gap-3 p-3 rounded-lg", tempConfig.bg)}>
          <Thermometer className={cn("h-5 w-5", tempConfig.color)} />
          <div>
            <p className="text-sm font-medium">Temperatura</p>
            <p className={cn("text-lg font-bold", tempConfig.color)}>{tempConfig.label}</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {signals.close_probability != null && (
          <div className="p-3 rounded-lg border border-border bg-card text-center">
            <Target className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(signals.close_probability)}%</p>
            <p className="text-xs text-muted-foreground">Prob. Fecho</p>
          </div>
        )}
        {signals.trust_score != null && (
          <div className="p-3 rounded-lg border border-border bg-card text-center">
            <Shield className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(signals.trust_score)}%</p>
            <p className="text-xs text-muted-foreground">Confiança</p>
          </div>
        )}
        {signals.buying_intent_score != null && (
          <div className="p-3 rounded-lg border border-border bg-card text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(signals.buying_intent_score)}%</p>
            <p className="text-xs text-muted-foreground">Intenção</p>
          </div>
        )}
        {signals.urgency_score != null && (
          <div className="p-3 rounded-lg border border-border bg-card text-center">
            <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(signals.urgency_score)}%</p>
            <p className="text-xs text-muted-foreground">Urgência</p>
          </div>
        )}
      </div>

      {/* Main Objection */}
      {signals.main_objection && signals.main_objection !== "none" && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Objeção Principal
            </p>
            <Badge variant="secondary" className="text-xs">
              {OBJECTION_LABELS[signals.main_objection] || signals.main_objection}
            </Badge>
          </div>
        </>
      )}

      {/* Next Action */}
      {signals.next_action && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Próxima Ação
          </p>
          <p className="text-sm bg-muted/50 p-2 rounded-md">{signals.next_action}</p>
        </div>
      )}

      {/* Recommended Reply */}
      {signals.recommended_reply && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            Resposta Recomendada
          </p>
          <p className="text-sm bg-primary/5 border border-primary/10 p-2 rounded-md italic">
            {signals.recommended_reply}
          </p>
        </div>
      )}

      {/* Key Signals */}
      {signals.signals_data?.key_signals && signals.signals_data.key_signals.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sinais Chave</p>
            <div className="space-y-1">
              {signals.signals_data.key_signals.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {s}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
