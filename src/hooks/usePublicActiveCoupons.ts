import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  valid_until: string | null;
}

export function usePublicActiveCoupons(workspaceId: string) {
  return useQuery({
    queryKey: ["public-active-coupons", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_coupons")
        .select("id, code, discount_type, discount_value, min_order_amount, valid_until")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("valid_until", { ascending: true, nullsFirst: false });
      if (error) throw error;

      // Filter: only coupons with a future valid_until (for countdown) or no expiry
      const now = new Date();
      return ((data || []) as PublicCoupon[]).filter(c => {
        if (!c.valid_until) return false; // skip no-expiry for countdown
        return new Date(c.valid_until) > now;
      });
    },
    enabled: !!workspaceId,
    refetchInterval: 60_000, // refresh every minute
  });
}
