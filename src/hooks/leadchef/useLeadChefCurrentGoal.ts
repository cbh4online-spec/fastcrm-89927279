import { useLeadChefGoals } from "./useLeadChefGoals";
import { startOfMonthIso } from "@/utils/leadchef/goals";

/** Conveniência para o objetivo do mês corrente do utilizador. */
export function useLeadChefCurrentGoal(periodMonth?: string) {
  return useLeadChefGoals(periodMonth ?? startOfMonthIso());
}
