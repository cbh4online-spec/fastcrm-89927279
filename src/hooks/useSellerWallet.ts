import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useWalletEntries(sellerId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["wallet-entries", wsId, sellerId],
    queryFn: async () => {
      if (!wsId || !sellerId) return [];
      const { data, error } = await supabase
        .from("marketplace_wallet_entries")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId && !!sellerId,
  });
}

export function useSellerBalance(sellerId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["seller-balance", wsId, sellerId],
    queryFn: async () => {
      if (!wsId || !sellerId) return { available: 0, pending: 0 };
      const { data, error } = await supabase
        .from("c2c_sellers")
        .select("balance_available, balance_pending")
        .eq("id", sellerId)
        .single();
      if (error) throw error;
      return {
        available: data?.balance_available ?? 0,
        pending: data?.balance_pending ?? 0,
      };
    },
    enabled: !!wsId && !!sellerId,
  });
}
