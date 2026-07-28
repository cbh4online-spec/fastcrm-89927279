import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CompanyFinancials {
  company_id: string;
  invoice_count: number;
  net_total: number;
  gross_total: number;
  paid_total: number;
  pending_total: number;
  overdue_total: number;
  sales_2023: number;
  sales_2024: number;
  sales_2025: number;
  sales_2026: number;
  last_invoice_date: string | null;
}

const num = (v: unknown) => Number(v) || 0;

/**
 * Agrega faturação por empresa (inclui faturas ligadas apenas a contactos da empresa).
 * Valores de faturação são líquidos (s/ IVA); pago/pendente usam base bruta.
 */
export function useCompaniesFinancials() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["companies-financials", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_companies_financials", {
        _workspace_id: workspaceId!,
      });
      if (error) throw error;
      const map = new Map<string, CompanyFinancials>();
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const id = String(row.company_id);
        map.set(id, {
          company_id: id,
          invoice_count: num(row.invoice_count),
          net_total: num(row.net_total),
          gross_total: num(row.gross_total),
          paid_total: num(row.paid_total),
          pending_total: num(row.pending_total),
          overdue_total: num(row.overdue_total),
          sales_2023: num(row.sales_2023),
          sales_2024: num(row.sales_2024),
          sales_2025: num(row.sales_2025),
          sales_2026: num(row.sales_2026),
          last_invoice_date: (row.last_invoice_date as string) ?? null,
        });
      }
      return map;
    },
  });

  return {
    financialsById: query.data ?? new Map<string, CompanyFinancials>(),
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
