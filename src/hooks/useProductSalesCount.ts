import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProductSalesCount(workspaceId: string) {
  return useQuery({
    queryKey: ["store-sales-count", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("items")
        .eq("workspace_id", workspaceId)
        .eq("status", "paid");

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const order of data || []) {
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const pid = item.product_id || item.productId;
          if (pid) {
            counts.set(pid, (counts.get(pid) || 0) + (item.quantity || 1));
          }
        }
      }
      return counts;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60_000,
  });
}

export function useBatchReviewStats(workspaceId: string) {
  return useQuery({
    queryKey: ["store-batch-reviews", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_reviews")
        .select("product_id, rating")
        .eq("workspace_id", workspaceId)
        .eq("is_approved", true);

      if (error) throw error;

      const stats = new Map<string, { sum: number; count: number }>();
      for (const r of data || []) {
        const existing = stats.get(r.product_id) || { sum: 0, count: 0 };
        existing.sum += r.rating;
        existing.count += 1;
        stats.set(r.product_id, existing);
      }
      return stats;
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
