import { useMemo } from "react";
import { Opportunity } from "@/types/opportunity";
import { Task } from "@/hooks/useTasks";
import { differenceInDays } from "date-fns";

export type HealthLabel = "healthy" | "watch" | "at_risk";
export type RiskSeverity = "high" | "medium" | "low";
export type NBAType = "follow_up" | "create_task" | "review_blockers" | "complete_data" | "send_recap";

export interface RiskDriver {
  reason: string;
  severity: RiskSeverity;
  penalty: number;
}

export interface NextBestAction {
  title: string;
  type: NBAType;
}

export interface DataCompleteness {
  percent: number;
  missingFields: string[];
}

export interface DealIntelligence {
  healthScore: number;
  healthLabel: HealthLabel;
  riskDrivers: RiskDriver[];
  nextBestAction: NextBestAction;
  dataCompleteness: DataCompleteness;
  topRiskReason: string | null;
}

const STAGE_LIMIT_DAYS = 14;

function computeDealIntelligence(
  opportunity: Opportunity,
  activities: { created_at: string }[],
  tasks: Task[],
): DealIntelligence {
  const now = new Date();
  const risks: RiskDriver[] = [];

  // --- Activity recency ---
  const lastActivityDate = opportunity.last_activity_at
    ? new Date(opportunity.last_activity_at)
    : activities.length > 0
      ? new Date(activities[0].created_at)
      : null;

  const daysSinceActivity = lastActivityDate
    ? differenceInDays(now, lastActivityDate)
    : Infinity;

  if (daysSinceActivity > 14) {
    risks.push({ reason: `Sem atividade há ${daysSinceActivity} dias`, severity: "high", penalty: 40 });
  } else if (daysSinceActivity > 7) {
    risks.push({ reason: `Sem atividade há ${daysSinceActivity} dias`, severity: "high", penalty: 25 });
  }

  // --- Next step / tasks ---
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const futureTasks = pendingTasks.filter(
    (t) => t.due_at && new Date(t.due_at) > now
  );

  if (pendingTasks.length === 0) {
    risks.push({ reason: "Sem próxima tarefa agendada", severity: "high", penalty: 20 });
  } else if (futureTasks.length > 0) {
    const nextDue = new Date(futureTasks[0].due_at!);
    const daysUntil = differenceInDays(nextDue, now);
    if (daysUntil > 7) {
      risks.push({ reason: `Próxima tarefa só daqui a ${daysUntil} dias`, severity: "medium", penalty: 10 });
    }
  }

  // --- Stage stagnation ---
  const daysInStage = differenceInDays(now, new Date(opportunity.updated_at));
  if (daysInStage > STAGE_LIMIT_DAYS * 2) {
    const stageName = opportunity.stage?.name || "atual";
    risks.push({ reason: `Parado na etapa "${stageName}" há ${daysInStage} dias`, severity: "high", penalty: 25 });
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    const stageName = opportunity.stage?.name || "atual";
    risks.push({ reason: `Na etapa "${stageName}" há ${daysInStage} dias`, severity: "medium", penalty: 15 });
  }

  // --- Data completeness ---
  const missingFields: string[] = [];
  if (!opportunity.value || Number(opportunity.value) === 0) missingFields.push("Valor");
  if (!opportunity.expected_close_date) missingFields.push("Data de fecho");
  if (!opportunity.contact_id && !opportunity.lead_id) missingFields.push("Contacto principal");

  const totalCheckedFields = 3;
  const filledCount = totalCheckedFields - missingFields.length;
  const completenessPercent = Math.round((filledCount / totalCheckedFields) * 100);

  if (!opportunity.value || Number(opportunity.value) === 0) {
    risks.push({ reason: "Valor não definido", severity: "medium", penalty: 10 });
  }
  if (!opportunity.expected_close_date) {
    risks.push({ reason: "Data de fecho não definida", severity: "medium", penalty: 10 });
  }
  if (!opportunity.contact_id && !opportunity.lead_id) {
    risks.push({ reason: "Sem contacto associado", severity: "low", penalty: 5 });
  }

  // --- Compute score ---
  const totalPenalty = risks.reduce((sum, r) => sum + r.penalty, 0);
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty));

  const healthLabel: HealthLabel =
    healthScore >= 80 ? "healthy" : healthScore >= 50 ? "watch" : "at_risk";

  // --- Sort risks by penalty desc, take top 3 ---
  const sortedRisks = [...risks].sort((a, b) => b.penalty - a.penalty).slice(0, 3);

  // --- Next best action ---
  let nextBestAction: NextBestAction;
  if (daysSinceActivity > 7) {
    nextBestAction = { title: "Agendar follow-up nas próximas 48h", type: "follow_up" };
  } else if (pendingTasks.length === 0) {
    nextBestAction = { title: "Criar próxima tarefa para este deal", type: "create_task" };
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    nextBestAction = { title: "Rever blockers e avançar etapa", type: "review_blockers" };
  } else if (missingFields.length > 0) {
    nextBestAction = { title: "Completar dados do deal", type: "complete_data" };
  } else {
    nextBestAction = { title: "Enviar recap ao stakeholder", type: "send_recap" };
  }

  return {
    healthScore,
    healthLabel,
    riskDrivers: sortedRisks,
    nextBestAction,
    dataCompleteness: { percent: completenessPercent, missingFields },
    topRiskReason: sortedRisks.length > 0 ? sortedRisks[0].reason : null,
  };
}

export function useDealIntelligence(
  opportunity: Opportunity | null | undefined,
  activities: { created_at: string }[],
  tasks: Task[],
): DealIntelligence | null {
  return useMemo(() => {
    if (!opportunity) return null;
    return computeDealIntelligence(opportunity, activities, tasks);
  }, [opportunity, activities, tasks]);
}

// Export for bulk use
export { computeDealIntelligence };
