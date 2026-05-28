import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import type { FinancialReportFilters } from "@/hooks/useFinancialReports";

export interface FinancialVerifyResult {
  totalInvoiced: number;
  totalReceived: number;
  totalDue: number;
  collectionRate: number;
  invoiceCount: number;
  computedAt: string;
}

export function useFinancialReportsVerify(filters: FinancialReportFilters, enabled: boolean) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["financial-reports-verify", currentWorkspace?.id, filters],
    enabled: enabled && !!currentWorkspace,
    staleTime: 30_000,
    queryFn: async (): Promise<FinancialVerifyResult | null> => {
      if (!currentWorkspace) return null;
      const { data, error } = await workspaceClient.rpc("financial_reports_verify" as any, {
        p_workspace_id: currentWorkspace.id,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_owner_id: filters.ownerId || null,
        p_company_id: filters.companyId || null,
        p_contact_id: filters.contactId || null,
      });
      if (error) throw error;
      const r: any = data || {};
      return {
        totalInvoiced: Number(r.total_invoiced) || 0,
        totalReceived: Number(r.total_received) || 0,
        totalDue: Number(r.total_due) || 0,
        collectionRate: Number(r.collection_rate) || 0,
        invoiceCount: Number(r.invoice_count) || 0,
        computedAt: r.computed_at || new Date().toISOString(),
      };
    },
  });
}
