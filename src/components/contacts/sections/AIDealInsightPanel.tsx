import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  RefreshCw,
  Copy,
  Check,
  Thermometer,
  TrendingUp,
  Shield,
  AlertTriangle,
  Zap,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationSignals } from "@/hooks/useConversationSignals";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AIDealInsightPanelProps {
  contactId?: string;
  leadId?: string;
}

const TEMPERATURE_CONFIG = {
  cold: {
    label: "Frio",
    emoji: "🧊",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50",
    barClass: "bg-blue-500",
  },
  evaluating: {
    label: "A Avaliar",
    emoji: "🤔",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
    barClass: "bg-amber-500",
  },
  ready_to_buy: {
    label: "Pronto p/ Comprar",
    emoji: "🔥",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
    barClass: "bg-emerald-500",
  },
  stalling: {
    label: "A Adiar",
    emoji: "⏳",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50",
    barClass: "bg-orange-500",
  },
  lost: {
    label: "Perdido",
    emoji: "❌",
    className: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground",
  },
};

const OBJECTION_LABELS: Record<string, string> = {
  price: "💰 Preço",
  timing: "⏰ Timing",
  authority: "👤 Autoridade",
  competitor: "⚔️ Concorrente",
  uncertainty: "❓ Incerteza",
  no_need: "🚫 Sem Necessidade",
  confusion: "🌀 Confusão",
  none: "✅ Sem Objeção",
};

function ScoreBar({ label, value, icon: Icon, colorClass = "bg-primary" }: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  colorClass?: string;
}) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AIDealInsightPanel({ contactId, leadId }: AIDealInsightPanelProps) {
  const { signals, isLoading, recompute, lastUpdated } = useConversationSignals(contactId, leadId);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      await recompute();
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleCopyReply = () => {
    if (!signals?.recommended_reply) return;
    navigator.clipboard.writeText(signals.recommended_reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tempConfig = signals?.temperature ? TEMPERATURE_CONFIG[signals.temperature] : null;

  return (
    <Card className="border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 to-violet-50/20 dark:from-indigo-950/20 dark:to-violet-950/10 dark:border-indigo-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-600" />
            AI Deal Insight
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecompute}
            disabled={isRecomputing || isLoading}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isRecomputing) && "animate-spin")} />
            {isRecomputing ? "A analisar..." : "Atualizar"}
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Última análise:{" "}
            {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !signals ? (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ainda não há mensagens suficientes para gerar insights.
              <br />
              Envie ou receba a primeira mensagem para ativar a análise.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecompute}
              disabled={isRecomputing}
              className="mt-3 gap-2"
            >
              <Zap className="h-3.5 w-3.5" />
              Gerar Análise
            </Button>
          </div>
        ) : (
          <>
            {/* Temperature + Close Probability */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temperatura</p>
                {tempConfig ? (
                  <Badge
                    variant="outline"
                    className={cn("text-sm font-semibold gap-1 px-2 py-1", tempConfig.className)}
                  >
                    {tempConfig.emoji} {tempConfig.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prob. de Fecho</p>
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  (signals.close_probability ?? 0) >= 0.7 && "text-emerald-600",
                  (signals.close_probability ?? 0) >= 0.4 && (signals.close_probability ?? 0) < 0.7 && "text-amber-600",
                  (signals.close_probability ?? 0) < 0.4 && "text-destructive",
                )}>
                  {Math.round((signals.close_probability ?? 0) * 100)}%
                </p>
              </div>
            </div>

            {/* Scores */}
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scores</p>
              <ScoreBar
                label="Confiança"
                value={signals.trust_score}
                icon={Shield}
                colorClass="bg-indigo-500"
              />
              <ScoreBar
                label="Intenção de Compra"
                value={signals.buying_intent_score}
                icon={TrendingUp}
                colorClass="bg-emerald-500"
              />
              <ScoreBar
                label="Urgência"
                value={signals.urgency_score}
                icon={Zap}
                colorClass="bg-amber-500"
              />
              <ScoreBar
                label="Risco de Perda"
                value={signals.churn_risk}
                icon={AlertTriangle}
                colorClass="bg-destructive"
              />
            </div>

            {/* Main Objection */}
            {signals.main_objection && (
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objeção Principal</p>
                <Badge variant="secondary" className="text-xs">
                  {OBJECTION_LABELS[signals.main_objection] || signals.main_objection}
                </Badge>
              </div>
            )}

            {/* Next Action */}
            {signals.next_action && (
              <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800/30 p-3">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-1.5">
                  Próxima Ação Recomendada
                </p>
                <p className="text-sm text-foreground leading-relaxed">{signals.next_action}</p>
              </div>
            )}

            {/* Recommended Reply */}
            {signals.recommended_reply && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resposta Sugerida</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyReply}
                    className="h-6 gap-1 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{signals.recommended_reply}"
                </p>
              </div>
            )}

            {/* Expandable Signal Details */}
            {signals.signals_data && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full h-7 text-xs text-muted-foreground gap-1"
                >
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showDetails ? "Menos detalhes" : "Ver detalhes dos sinais"}
                </Button>

                {showDetails && (
                  <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
                    {signals.signals_data.key_signals && signals.signals_data.key_signals.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sinais Detetados</p>
                        <div className="flex flex-wrap gap-1">
                          {signals.signals_data.key_signals.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {signals.signals_data.objection_handling && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Como Lidar com Objeção</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {signals.signals_data.objection_handling}
                        </p>
                      </div>
                    )}

                    {signals.signals_data.positive_indicators && signals.signals_data.positive_indicators.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">✅ Sinais Positivos</p>
                        <ul className="space-y-0.5">
                          {signals.signals_data.positive_indicators.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {signals.signals_data.risk_indicators && signals.signals_data.risk_indicators.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-destructive mb-1">⚠️ Riscos</p>
                        <ul className="space-y-0.5">
                          {signals.signals_data.risk_indicators.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
