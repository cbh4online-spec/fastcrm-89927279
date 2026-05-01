import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PartnerOrderApprovalLogEntry {
  id: string;
  workspace_id: string;
  partner_order_id: string;
  partner_account_id: string;
  order_number: string;
  previous_status: string;
  new_status: string;
  decision: "approved" | "rejected" | "cancelled" | "reopened" | "auto";
  decided_by: string | null;
  decision_reason: string | null;
  total_gross: number;
  metadata: Record<string, unknown>;
  created_at: string;
  partner_accounts?: { legal_name: string; trade_name: string | null } | null;
}

interface Options {
  partnerAccountId?: string;
  limit?: number;
}

export function usePartnerOrderApprovalHistory({ partnerAccountId, limit = 50 }: Options = {}) {
  const { currentWorkspace } = useWorkspace();

  const query = useQuery({
    queryKey: ["partner-order-approval-history", currentWorkspace?.id, partnerAccountId, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from("partner_order_approvals_log")
        .select("*, partner_accounts(legal_name, trade_name)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (partnerAccountId) q = q.eq("partner_account_id", partnerAccountId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PartnerOrderApprovalLogEntry[];
    },
  });

  return {
    history: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
