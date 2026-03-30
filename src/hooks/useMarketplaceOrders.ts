import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useMarketplaceOrders(sellerId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["marketplace-orders", wsId, sellerId],
    queryFn: async () => {
      if (!wsId) return [];
      let query = supabase
        .from("marketplace_orders")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });

      if (sellerId) {
        query = query.eq("seller_id", sellerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });
}
