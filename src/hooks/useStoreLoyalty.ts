import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LoyaltySettings {
  id: string;
  workspace_id: string;
  is_active: boolean;
  points_per_euro: number;
  points_value_cents: number;
  min_redeem_points: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  workspace_id: string;
  user_id: string;
  order_id: string | null;
  points: number;
  type: "earned" | "redeemed" | "expired" | "adjusted";
  description: string | null;
  balance_after: number;
  created_at: string;
}

// Admin hook — fetch loyalty settings for workspace
export function useLoyaltySettings(workspaceId?: string) {
  return useQuery({
    queryKey: ["loyalty-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("loyalty_settings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LoyaltySettings | null;
    },
    enabled: !!workspaceId,
  });
}

// Public hook — fetch active loyalty settings for store visitors
export function usePublicLoyaltySettings(workspaceId?: string) {
  return useQuery({
    queryKey: ["loyalty-settings-public", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("loyalty_settings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return null;
      return data as unknown as LoyaltySettings | null;
    },
    enabled: !!workspaceId,
  });
}

// Upsert loyalty settings
export function useUpsertLoyaltySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<LoyaltySettings> & { workspace_id: string }) => {
      const { data, error } = await supabase
        .from("loyalty_settings" as any)
        .upsert(
          {
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-settings", variables.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-settings-public", variables.workspace_id] });
      toast.success("Configurações de fidelidade guardadas");
    },
    onError: (error) => {
      toast.error("Erro ao guardar: " + error.message);
    },
  });
}

// Get loyalty balance for current user
export function useLoyaltyBalance(workspaceId?: string) {
  return useQuery({
    queryKey: ["loyalty-balance", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase.rpc("get_loyalty_balance" as any, {
        p_user_id: user.id,
        p_workspace_id: workspaceId,
      });
      if (error) return 0;
      return (data as number) || 0;
    },
    enabled: !!workspaceId,
  });
}

// Get loyalty transaction history for current user
export function useLoyaltyHistory(workspaceId?: string) {
  return useQuery({
    queryKey: ["loyalty-history", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("loyalty_points_transactions" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data as unknown as LoyaltyTransaction[]) || [];
    },
    enabled: !!workspaceId,
  });
}

// Admin: get top customers by points
export function useLoyaltyTopCustomers(workspaceId?: string) {
  return useQuery({
    queryKey: ["loyalty-top-customers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("loyalty_points_transactions" as any)
        .select("user_id, points")
        .eq("workspace_id", workspaceId);
      if (error) return [];
      // Aggregate by user
      const map = new Map<string, number>();
      (data as any[]).forEach((t) => {
        map.set(t.user_id, (map.get(t.user_id) || 0) + t.points);
      });
      return Array.from(map.entries())
        .map(([user_id, total_points]) => ({ user_id, total_points }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10);
    },
    enabled: !!workspaceId,
  });
}

// Redeem points — creates a temporary coupon
export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      pointsToRedeem,
    }: {
      workspaceId: string;
      pointsToRedeem: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Get settings
      const { data: settings } = await supabase
        .from("loyalty_settings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .single();

      if (!settings) throw new Error("Programa de fidelidade não ativo");

      const s = settings as unknown as LoyaltySettings;
      if (pointsToRedeem < s.min_redeem_points) {
        throw new Error(`Mínimo de ${s.min_redeem_points} pontos para resgate`);
      }

      // Check balance
      const { data: balance } = await supabase.rpc("get_loyalty_balance" as any, {
        p_user_id: user.id,
        p_workspace_id: workspaceId,
      });

      if ((balance as number) < pointsToRedeem) {
        throw new Error("Saldo insuficiente");
      }

      // Calculate discount value in EUR
      const discountCents = pointsToRedeem * s.points_value_cents;
      const discountEur = discountCents / 100;

      // Create temporary coupon
      const couponCode = `LOYALTY-${Date.now().toString(36).toUpperCase()}`;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days

      const { error: couponError } = await supabase
        .from("store_coupons")
        .insert({
          workspace_id: workspaceId,
          code: couponCode,
          discount_type: "fixed",
          discount_value: discountEur,
          max_uses: 1,
          is_active: true,
          valid_until: validUntil.toISOString(),
        });

      if (couponError) throw new Error("Erro ao criar cupão: " + couponError.message);

      // Record redemption transaction
      const newBalance = (balance as number) - pointsToRedeem;
      const { error: txError } = await supabase
        .from("loyalty_points_transactions" as any)
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          points: -pointsToRedeem,
          type: "redeemed",
          description: `Resgate de ${pointsToRedeem} pontos — Cupão ${couponCode}`,
          balance_after: newBalance,
        });

      if (txError) throw new Error("Erro ao registar resgate");

      return { couponCode, discountEur, newBalance };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-balance", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-history", variables.workspaceId] });
      toast.success(`Cupão criado: ${data.couponCode} (${data.discountEur.toFixed(2)}€)`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
