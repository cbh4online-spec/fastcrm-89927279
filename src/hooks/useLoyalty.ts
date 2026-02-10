import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LoyaltyProfile {
  id: string;
  balance: number;
  lifetime_points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: number | null;
  min_tier: string;
  is_active: boolean;
  stock: number | null;
}

const tierThresholds = { bronze: 0, silver: 500, gold: 2000, platinum: 10000 };

export function useLoyaltyProfile(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-profile", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyProfile | null;
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useLoyaltyTransactions(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-transactions", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LoyaltyTransaction[];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useLoyaltyRewards(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["loyalty-rewards", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("points_cost");
      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!workspaceId,
  });
}

export function useRedeemReward(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reward: LoyaltyReward) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      // Get current balance
      const { data: profile } = await supabase
        .from("loyalty_points")
        .select("balance, tier")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.balance < reward.points_cost) {
        throw new Error("Pontos insuficientes");
      }

      // Deduct points
      await supabase
        .from("loyalty_points")
        .update({ balance: profile.balance - reward.points_cost })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);

      // Record transaction
      await supabase.from("loyalty_transactions").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        points: -reward.points_cost,
        type: "redeem",
        description: `Resgate: ${reward.name}`,
        reference_id: reward.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-profile"] });
      qc.invalidateQueries({ queryKey: ["loyalty-transactions"] });
      toast.success("Recompensa resgatada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function getTierProgress(lifetimePoints: number) {
  if (lifetimePoints >= tierThresholds.platinum) return { tier: "platinum" as const, next: null, progress: 100 };
  if (lifetimePoints >= tierThresholds.gold) return { tier: "gold" as const, next: "platinum" as const, progress: Math.round(((lifetimePoints - tierThresholds.gold) / (tierThresholds.platinum - tierThresholds.gold)) * 100) };
  if (lifetimePoints >= tierThresholds.silver) return { tier: "silver" as const, next: "gold" as const, progress: Math.round(((lifetimePoints - tierThresholds.silver) / (tierThresholds.gold - tierThresholds.silver)) * 100) };
  return { tier: "bronze" as const, next: "silver" as const, progress: Math.round((lifetimePoints / tierThresholds.silver) * 100) };
}
