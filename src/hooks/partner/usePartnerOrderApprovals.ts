import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface PendingPartnerOrder {
  id: string;
  workspace_id: string;
  order_number: string;
  status: string;
  partner_account_id: string;
  buyer_user_id: string | null;
  po_number: string | null;
  currency: string;
  subtotal_net: number;
  total_gross: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  notes: string | null;
  created_at: string;
  stock_reserved: boolean;
  stock_committed: boolean;
  // joined
  partner_accounts?: { id: string; legal_name: string; trade_name: string | null; credit_limit: number; current_credit_exposure: number } | null;
  partner_order_items: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    sku: string | null;
    product_name: string;
    variant_label: string | null;
    quantity: number;
    unit_price_net: number;
    line_total_net: number;
    // Joined variant info to show stock impact
    product_variants?: {
      id: string;
      stock_quantity: number;
      stock_reserved: number;
      track_stock: boolean;
    } | null;
  }>;
}

export function usePartnerOrderApprovals() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["partner-order-approvals", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_order_headers")
        .select(`
          *,
          partner_accounts(id, legal_name, trade_name, credit_limit, current_credit_exposure),
          partner_order_items(
            id, product_id, variant_id, sku, product_name, variant_label,
            quantity, unit_price_net, line_total_net,
            product_variants(id, stock_quantity, stock_reserved, track_stock)
          )
        `)
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "awaiting_approval")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as PendingPartnerOrder[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({
      orderId,
      decision,
      reason,
    }: {
      orderId: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) => {
      // Map decision to actual status: approved -> submitted (downstream lifecycle handles processing)
      const newStatus = decision === "approved" ? "submitted" : "rejected";
      const nowIso = new Date().toISOString();
      const { data: userRes } = await supabase.auth.getUser();

      const updates: Record<string, unknown> = {
        status: newStatus,
        approver_user_id: userRes.user?.id ?? null,
      };
      if (decision === "approved") {
        updates.approved_at = nowIso;
        if (reason) updates.notes = reason;
      } else {
        updates.rejected_at = nowIso;
        updates.rejection_reason = reason ?? null;
      }

      const { error } = await supabase
        .from("partner_order_headers")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-order-approvals"] });
      qc.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success(
        vars.decision === "approved"
          ? "Encomenda aprovada e stock confirmado"
          : "Encomenda rejeitada e stock libertado",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    orders: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    decide: decide.mutateAsync,
    isDeciding: decide.isPending,
  };
}
