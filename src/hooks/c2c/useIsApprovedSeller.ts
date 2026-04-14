import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsApprovedSeller(workspaceId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["c2c-is-approved-seller", workspaceId, user?.id],
    enabled: !!workspaceId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("c2c_sellers")
        .select("id, user_id, slug, display_name")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user!.id)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; user_id: string; slug: string; display_name: string } | null;
    },
  });

  return {
    isSeller: !!query.data,
    sellerId: query.data?.id ?? null,
    sellerUserId: query.data?.user_id ?? null,
    isLoading: query.isLoading,
  };
}
