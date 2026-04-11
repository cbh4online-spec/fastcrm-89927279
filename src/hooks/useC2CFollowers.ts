import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSellerFollowerCount(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-follower-count", sellerId],
    queryFn: async () => {
      if (!sellerId) return 0;
      const { count, error } = await supabase
        .from("c2c_seller_followers")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!sellerId,
  });
}

export function useIsFollowing(sellerId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-is-following", sellerId, user?.id],
    queryFn: async () => {
      if (!sellerId || !user) return false;
      const { data } = await supabase
        .from("c2c_seller_followers")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("follower_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!sellerId && !!user,
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sellerId,
      workspaceId,
    }: {
      sellerId: string;
      workspaceId: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const { data: existing } = await supabase
        .from("c2c_seller_followers")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("follower_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("c2c_seller_followers")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "unfollowed" as const };
      } else {
        const { error } = await supabase
          .from("c2c_seller_followers")
          .insert({
            seller_id: sellerId,
            follower_id: user.id,
            workspace_id: workspaceId,
          });
        if (error) throw error;
        return { action: "followed" as const };
      }
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["c2c-follower-count", vars.sellerId] });
      qc.invalidateQueries({ queryKey: ["c2c-is-following", vars.sellerId] });
      toast.success(
        result.action === "followed"
          ? "A seguir este vendedor!"
          : "Deixaste de seguir"
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao processar");
    },
  });
}

// Follower milestone badges
export interface FollowerMilestone {
  key: string;
  label: string;
  threshold: number;
  color: string;
  emoji: string;
  tooltip: string;
}

export const FOLLOWER_MILESTONES: FollowerMilestone[] = [
  { key: "rising", threshold: 100, label: "Em Ascensão", color: "bg-teal-500/10 text-teal-600 border-teal-500/20", emoji: "🚀", tooltip: "100+ seguidores" },
  { key: "popular", threshold: 500, label: "Popular", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", emoji: "🔥", tooltip: "500+ seguidores" },
  { key: "influencer", threshold: 1000, label: "Influencer", color: "bg-pink-500/10 text-pink-600 border-pink-500/20", emoji: "⭐", tooltip: "1000+ seguidores" },
  { key: "legendary", threshold: 5000, label: "Lendário", color: "bg-amber-500/10 text-amber-700 border-amber-500/30", emoji: "👑", tooltip: "5000+ seguidores" },
];

export function getFollowerMilestones(followerCount: number): FollowerMilestone[] {
  return FOLLOWER_MILESTONES.filter((m) => followerCount >= m.threshold);
}
