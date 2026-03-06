import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ReturnRequestItem {
  id: string;
  return_request_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  reason: string | null;
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  workspace_id: string;
  order_id: string;
  request_number: string;
  status: "pending" | "approved" | "rejected" | "refunded" | "cancelled";
  return_type: "full" | "partial";
  reason: string;
  reason_category: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  refund_amount: number | null;
  stripe_refund_id: string | null;
  requested_by: "client" | "admin";
  requested_by_user_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  items?: ReturnRequestItem[];
  store_orders?: Record<string, unknown>;
}

export const RETURN_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  approved: { label: "Aprovado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Reembolsado", color: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export const RETURN_REASON_CATEGORIES: Record<string, string> = {
  defective: "Produto com defeito",
  wrong_item: "Produto errado enviado",
  not_as_described: "Diferente da descrição",
  changed_mind: "Mudança de ideias",
  duplicate: "Encomenda duplicada",
  other: "Outro",
};

export function useReturnRequests(filters?: { status?: string; orderId?: string }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["return-requests", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("return_requests")
        .select("*, items:return_request_items(*), store_orders:order_id(id, order_number, customer_name, customer_email, total, status)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.orderId) {
        query = query.eq("order_id", filters.orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ReturnRequest[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useReturnRequestsByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["return-requests-order", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, items:return_request_items(*)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReturnRequest[];
    },
    enabled: !!orderId,
  });
}

export function useCreateReturnRequest() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      orderId,
      returnType,
      reason,
      reasonCategory,
      customerNotes,
      refundAmount,
      items,
      requestedBy,
    }: {
      orderId: string;
      returnType: "full" | "partial";
      reason: string;
      reasonCategory?: string;
      customerNotes?: string;
      refundAmount?: number;
      items?: Array<{ product_id?: string; product_name: string; quantity: number; unit_price: number; reason?: string }>;
      requestedBy: "client" | "admin";
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: rr, error } = await supabase
        .from("return_requests")
        .insert({
          workspace_id: currentWorkspace?.id!,
          order_id: orderId,
          return_type: returnType,
          reason,
          reason_category: reasonCategory || null,
          customer_notes: customerNotes || null,
          refund_amount: refundAmount || null,
          requested_by: requestedBy,
          requested_by_user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items for partial returns
      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase
          .from("return_request_items")
          .insert(items.map(item => ({
            return_request_id: rr.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            reason: item.reason || null,
          })));
        if (itemsErr) throw itemsErr;
      }

      // Add event to order timeline
      await supabase.from("store_order_events").insert({
        order_id: orderId,
        workspace_id: currentWorkspace?.id!,
        event_type: "note_added",
        description: `Pedido de devolução ${returnType === "full" ? "total" : "parcial"} criado (${rr.request_number}).`,
        created_by: user?.id || null,
      });

      return rr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["return-requests-order"] });
      queryClient.invalidateQueries({ queryKey: ["store-order-events"] });
      console.log('[ECOMMERCE] Return request created');
      toast.success("Pedido de devolução criado");
    },
    onError: (err) => {
      console.warn('[ECOMMERCE] RETURN_CREATE_FAILED', err.message);
      toast.error("Erro: " + err.message);
    },
  });
}

export function useProcessReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnRequestId,
      action,
      adminNotes,
    }: {
      returnRequestId: string;
      action: "approve" | "reject";
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: { returnRequestId, action, adminNotes },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["return-requests-order"] });
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["store-order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["store-order-events"] });
      console.log(`[ECOMMERCE] Return processed: ${data.status}`);
      toast.success(data.status === "refunded" ? "Reembolso processado com sucesso" : "Pedido de devolução rejeitado");
    },
    onError: (err) => {
      console.warn('[ECOMMERCE] RETURN_PROCESS_FAILED', err.message);
      toast.error("Erro ao processar: " + err.message);
    },
  });
}
