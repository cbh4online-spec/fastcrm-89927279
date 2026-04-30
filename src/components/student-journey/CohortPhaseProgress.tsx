import { useMemo } from "react";
import { Calendar, Layers } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useCohortPhases } from "@/hooks/useCohortPhases";
import { cn } from "@/lib/utils";

interface CohortPhaseProgressProps {
  cohortId: string;
  className?: string;
  compact?: boolean;
}

/**
 * Mostra a próxima sessão (fase) e o progresso "X de Y fases"
 * baseado nas fases activas da cohort.
 *
 * - Próxima fase = primeira fase com end_date >= hoje (ordenada por start_date).
 * - Se todas as fases já terminaram, mostra a última como "Concluído".
 * - Se não houver fases, mostra "Sem fases definidas".
 */
export function CohortPhaseProgress({ cohortId, className, compact }: CohortPhaseProgressProps) {
  const { phases, isLoading } = useCohortPhases(cohortId);

  const { nextPhase, currentIndex, total, allFinished } = useMemo(() => {
    if (!phases.length) {
      return { nextPhase: null, currentIndex: 0, total: 0, allFinished: false };
    }
    const sorted = [...phases].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const today = new Date().toISOString().slice(0, 10);
    const idx = sorted.findIndex((p) => p.end_date >= today);
    if (idx === -1) {
      return {
        nextPhase: sorted[sorted.length - 1],
        currentIndex: sorted.length,
        total: sorted.length,
        allFinished: true,
      };
    }
    return {
      nextPhase: sorted[idx],
      currentIndex: idx + 1,
      total: sorted.length,
      allFinished: false,
    };
  }, [phases]);

  if (isLoading) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>A carregar fases…</div>
    );
  }

  if (!total) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        Sem fases definidas
      </div>
    );
  }

  const dateLabel = nextPhase
    ? format(new Date(nextPhase.start_date), "dd MMM yyyy", { locale: pt })
    : "-";

  return (
    <div className={cn("flex flex-col gap-0.5", compact && "text-xs", className)}>
      <span className="flex items-center gap-1 text-foreground">
        <Calendar className={cn("h-3.5 w-3.5 text-muted-foreground", compact && "h-3 w-3")} />
        {allFinished ? (
          <span className="text-muted-foreground">Concluído</span>
        ) : (
          <span>
            Próx. sessão: <span className="font-medium">{dateLabel}</span>
            {nextPhase?.title ? (
              <span className="text-muted-foreground"> · {nextPhase.title}</span>
            ) : null}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Layers className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
        Fase {Math.min(currentIndex, total)} de {total}
      </span>
    </div>
  );
}
