import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { X, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  StrategicDecision,
  useDismissDecision,
  useConvertDecisionStep,
  useConvertAllDecisionSteps,
} from "@/hooks/useStrategicDecisions";

// ── Badge configs ─────────────────────────────────────────────────────────────

const IMPACT_CONFIG = {
  high: { label: "Alto Impacto", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Médio Impacto", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  low: { label: "Baixo Impacto", className: "bg-muted text-muted-foreground" },
};

const URGENCY_CONFIG = {
  immediate: { label: "⚡ Imediato", className: "bg-destructive text-destructive-foreground border-destructive" },
  this_week: { label: "Esta Semana", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  monitor: { label: "Monitorar", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
};

const AREA_CONFIG = {
  sales: { label: "🎯 Vendas" },
  marketing: { label: "📣 Marketing" },
  pricing: { label: "💶 Preços" },
  operations: { label: "⚙️ Operações" },
  retention: { label: "🛡 Retenção" },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  decision: StrategicDecision;
}

export function StrategicDecisionCard({ decision }: Props) {
  const dismiss = useDismissDecision();
  const convertStep = useConvertDecisionStep();
  const convertAll = useConvertAllDecisionSteps();
  const [convertedSteps, setConvertedSteps] = useState<Set<number>>(new Set());
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);

  const impactCfg = IMPACT_CONFIG[decision.impact_level] ?? IMPACT_CONFIG.low;
  const urgencyCfg = URGENCY_CONFIG[decision.urgency] ?? URGENCY_CONFIG.monitor;
  const areaCfg = AREA_CONFIG[decision.business_area] ?? { label: decision.business_area };

  const handleDismiss = async () => {
    try {
      await dismiss.mutateAsync(decision.id);
    } catch {
      toast.error("Erro ao fechar decisão.");
    }
  };

  const handleConvertStep = async (step: string, index: number) => {
    setCreatingIndex(index);
    try {
      await convertStep.mutateAsync({ step, decisionId: decision.id });
      setConvertedSteps((prev) => new Set([...prev, index]));
      toast.success("Tarefa criada!");
    } catch {
      toast.error("Erro ao criar tarefa.");
    } finally {
      setCreatingIndex(null);
    }
  };

  const handleConvertAll = async () => {
    try {
      await convertAll.mutateAsync({
        steps: decision.recommended_steps,
        decisionId: decision.id,
      });
      toast.success(`${decision.recommended_steps.length} tarefas criadas!`);
    } catch {
      toast.error("Erro ao criar tarefas.");
    }
  };

  const allConverted =
    decision.recommended_steps.length > 0 &&
    convertedSteps.size >= decision.recommended_steps.length;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        allConverted && "opacity-60"
      )}
    >
      {/* Header row */}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-xs border", impactCfg.className)}>
            {impactCfg.label}
          </Badge>
          <Badge variant="outline" className={cn("text-xs border", urgencyCfg.className)}>
            {urgencyCfg.label}
          </Badge>
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            {areaCfg.label}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDistanceToNow(new Date(decision.created_at), {
                addSuffix: true,
                locale: pt,
              })}
            </span>
            <button
              onClick={handleDismiss}
              disabled={dismiss.isPending}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-0.5"
              aria-label="Fechar decisão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-snug mt-2">
          {decision.decision_title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {decision.explanation}
        </p>

        {/* Recommended steps */}
        {decision.recommended_steps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Passos recomendados
              </p>
              {decision.recommended_steps.length > 1 && !allConverted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={handleConvertAll}
                  disabled={convertAll.isPending}
                >
                  {convertAll.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Criar Todas as Tarefas
                </Button>
              )}
            </div>

            <div>
              {decision.recommended_steps.map((step, i) => {
                const done = convertedSteps.has(i);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5",
                        done
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-primary/15 text-primary"
                      )}
                    >
                      {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </div>
                    <p
                      className={cn(
                        "flex-1 text-sm leading-relaxed",
                        done ? "line-through text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {step}
                    </p>
                    {!done && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 h-7 px-2 text-xs gap-1"
                        onClick={() => handleConvertStep(step, i)}
                        disabled={creatingIndex === i || convertAll.isPending}
                      >
                        {creatingIndex === i ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        Tarefa
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {allConverted && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Todos os passos convertidos em tarefas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
