import { useMemo } from "react";
import { Calendar, Layers } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useCohortPhases, type CohortPhase } from "@/hooks/useCohortPhases";
import { cn } from "@/lib/utils";

interface CohortPhaseProgressProps {
  cohortId: string;
  /** Datas da própria turma — usadas como fallback quando não há fases registadas. */
  fallbackStartDate?: string | null;
  fallbackEndDate?: string | null;
  fallbackTitle?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Mostra a próxima sessão (fase) e o progresso "X de Y fases".
 *
 * Estratégia:
 * - Se a turma tem fases em `sj_course_phases`, usa-as.
 * - Caso contrário, e se a turma tiver `start_date`/`end_date`, gera em runtime
 *   uma fase virtual única (não persistida) para garantir que a listagem
 *   continua a mostrar a próxima sessão.
 * - Sem fases nem datas → "Sem datas definidas".
 */
export function CohortPhaseProgress({
  cohortId,
  fallbackStartDate,
  fallbackEndDate,
  fallbackTitle = "Sessão única",
  className,
  compact,
}: CohortPhaseProgressProps) {
  const { phases, isLoading } = useCohortPhases(cohortId);

  const effectivePhases = useMemo<Array<Pick<CohortPhase, "start_date" | "end_date" | "title">>>(() => {
    if (phases.length) return phases;
    if (fallbackStartDate && fallbackEndDate) {
      return [
        {
          start_date: fallbackStartDate,
          end_date: fallbackEndDate,
          title: fallbackTitle,
        },
      ];
    }
    return [];
  }, [phases, fallbackStartDate, fallbackEndDate, fallbackTitle]);

  const isVirtual = phases.length === 0 && effectivePhases.length > 0;

  const { nextPhase, currentIndex, total, allFinished } = useMemo(() => {
    if (!effectivePhases.length) {
      return { nextPhase: null, currentIndex: 0, total: 0, allFinished: false };
    }
    const sorted = [...effectivePhases].sort((a, b) => a.start_date.localeCompare(b.start_date));
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
  }, [effectivePhases]);

  if (isLoading) {
    return <div className={cn("text-xs text-muted-foreground", className)}>A carregar fases…</div>;
  }

  if (!total) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        Sem datas definidas
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
        {isVirtual ? <span className="italic"> · auto</span> : null}
      </span>
    </div>
  );
}
