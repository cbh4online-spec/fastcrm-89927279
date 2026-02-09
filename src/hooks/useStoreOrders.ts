import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StoreOrder {
  id: string;
  workspace_id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    sku?: string;
  }>;
  subtotal: number | null;
  tax_total: number | null;
  total: number;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  billing_address: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useStoreOrders(filters?: { status?: string; search?: string }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["store-orders", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("store_orders")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as StoreOrder[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateStoreOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) updates.notes = notes;
      if (status === "paid") updates.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from("store_orders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      toast.success("Estado da encomenda atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar encomenda: " + error.message);
    },
  });
}
