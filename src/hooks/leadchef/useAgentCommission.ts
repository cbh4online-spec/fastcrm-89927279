import { useMemo } from "react";
import { useLeadChefMonthlyProgress } from "./useLeadChefMonthlyProgress";
import { calcCommission } from "@/utils/leadchef/commissions";

export function useAgentCommission(periodMonth?: string) {
  const progressQ = useLeadChefMonthlyProgress(periodMonth);
  const sales = progressQ.data?.salesWon ?? 0;
  const result = useMemo(() => calcCommission(sales), [sales]);
  return {
    isLoading: progressQ.isLoading,
    error: progressQ.error,
    sales,
    ...result,
  };
}
