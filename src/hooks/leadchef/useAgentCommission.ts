import { useMemo } from "react";
import { useLeadChefMonthlyProgress } from "./useLeadChefMonthlyProgress";
import {
  calcCommission,
  POST_SALE_VISIT_FEE,
  RECRUITMENT_BONUS_ENTRY,
  RECRUITMENT_BONUS_2ND_SALE,
} from "@/utils/leadchef/commissions";

export function useAgentCommission(periodMonth?: string) {
  const progressQ = useLeadChefMonthlyProgress(periodMonth);
  const sales = progressQ.data?.salesWon ?? 0;
  const postSaleVisits = progressQ.data?.postSaleVisits ?? 0;
  const recruitmentEntries = progressQ.data?.recruitmentEntries ?? 0;

  const result = useMemo(() => calcCommission(sales), [sales]);

  const visitsTotal = postSaleVisits * POST_SALE_VISIT_FEE;
  const recruitmentTotal = recruitmentEntries * RECRUITMENT_BONUS_ENTRY;
  // Bónus 2.ª venda do embaixador: aproximação = vendas extra a partir do 2.º recrutamento ativo no mês.
  const secondSaleBonus = Math.max(0, recruitmentEntries - 1) * RECRUITMENT_BONUS_2ND_SALE;
  const extrasTotal = visitsTotal + recruitmentTotal + secondSaleBonus;
  const grandTotal = result.total + extrasTotal;

  return {
    isLoading: progressQ.isLoading,
    error: progressQ.error,
    sales,
    postSaleVisits,
    recruitmentEntries,
    visitsTotal,
    recruitmentTotal,
    secondSaleBonus,
    extrasTotal,
    grandTotal,
    ...result,
  };
}
