import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const sb = supabase as any;

export interface AbandonedCart {
  id: string;
  workspace_id: string;
  session_id: string | null;
  contact_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  cart_items: any[];
  cart_value: number;
  currency: string;
  detected_at: string;
  recovery_status: string;
  recovered_at: string | null;
  recovery_channel: string | null;
  recovery_url: string | null;
  touch_1_at: string | null;
  touch_2_at: string | null;
  touch_3_at: string | null;
  expires_at: string;
  created_at: string;
}

interface AbandonedCartFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAbandonedCarts(filters?: AbandonedCartFilters) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["abandoned-carts", wsId, filters],
    queryFn: async () => {
      if (!wsId) return [];
      let q = sb
        .from("abandoned_carts")
        .select("*")
        .eq("workspace_id", wsId)
        .order("detected_at", { ascending: false })
        .limit(200);

      if (filters?.status && filters.status !== "all") {
        q = q.eq("recovery_status", filters.status);
      }
      if (filters?.dateFrom) q = q.gte("detected_at", filters.dateFrom);
      if (filters?.dateTo) q = q.lte("detected_at", filters.dateTo);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AbandonedCart[];
    },
    enabled: !!wsId,
  });
}

export function useAbandonedCartStats() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["abandoned-cart-stats", wsId],
    queryFn: async () => {
      if (!wsId) return { total: 0, pending: 0, recovered: 0, expired: 0, totalValue: 0, recoveredValue: 0 };

      const { data, error } = await sb
        .from("abandoned_carts")
        .select("recovery_status, cart_value")
        .eq("workspace_id", wsId);

      if (error) throw error;

      const carts = data || [];
      const total = carts.length;
      const pending = carts.filter((c: any) => ["pending", "touch_1_sent", "touch_2_sent", "touch_3_sent"].includes(c.recovery_status)).length;
      const recovered = carts.filter((c: any) => c.recovery_status === "recovered").length;
      const expired = carts.filter((c: any) => c.recovery_status === "expired").length;
      const totalValue = carts.reduce((s: number, c: any) => s + Number(c.cart_value || 0), 0);
      const recoveredValue = carts
        .filter((c: any) => c.recovery_status === "recovered")
        .reduce((s: number, c: any) => s + Number(c.cart_value || 0), 0);

      return { total, pending, recovered, expired, totalValue, recoveredValue };
    },
    enabled: !!wsId,
  });
}
