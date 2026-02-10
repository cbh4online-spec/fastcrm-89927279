import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralSettings {
  id: string;
  workspace_id: string;
  is_active: boolean;
  referrer_reward_points: number;
  referee_discount_percent: number | null;
  referee_discount_amount: number | null;
  min_order_value: number;
}

export interface ReferralCode {
  id: string;
  workspace_id: string;
  user_id: string;
  code: string;
  uses_count: number;
  created_at: string;
}

export interface Referral {
  id: string;
  workspace_id: string;
  referrer_user_id: string;
  referee_user_id: string | null;
  referee_order_id: string | null;
  referral_code_id: string;
  status: string;
  referrer_rewarded: boolean;
  created_at: string;
  completed_at: string | null;
}

export function useReferralSettings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["referral-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("store_referral_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as ReferralSettings | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertReferralSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: {
      workspace_id: string;
      is_active: boolean;
      referrer_reward_points: number;
      referee_discount_percent: number | null;
      referee_discount_amount: number | null;
      min_order_value: number;
    }) => {
      const { error } = await supabase
        .from("store_referral_settings")
        .upsert(settings, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["referral-settings", variables.workspace_id] });
    },
  });
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useMyReferralCode(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["my-referral-code", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try to find existing code
      const { data: existing } = await supabase
        .from("store_referral_codes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) return existing as ReferralCode;

      // Create new code
      const code = generateReferralCode();
      const { data: created, error } = await supabase
        .from("store_referral_codes")
        .insert({ workspace_id: workspaceId, user_id: user.id, code })
        .select()
        .single();
      if (error) throw error;
      return created as ReferralCode;
    },
    enabled: !!workspaceId,
  });
}

export function useMyReferrals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["my-referrals", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workspaceId) return [];
      const { data, error } = await supabase
        .from("store_referrals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Referral[];
    },
    enabled: !!workspaceId,
  });
}

export function useTopReferrers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["top-referrers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_referral_codes")
        .select("user_id, code, uses_count")
        .eq("workspace_id", workspaceId)
        .order("uses_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useApplyReferralCode() {
  return useMutation({
    mutationFn: async ({ code, workspaceId }: { code: string; workspaceId: string }) => {
      // Validate referral code exists
      const { data: refCode, error } = await supabase
        .from("store_referral_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!refCode) throw new Error("Código de referral inválido");

      // Check if user is trying to use their own code
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === refCode.user_id) {
        throw new Error("Não pode usar o seu próprio código de referral");
      }

      // Get settings to check discount
      const { data: settings } = await supabase
        .from("store_referral_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .maybeSingle();

      if (!settings) throw new Error("Programa de referrals não está ativo");

      return {
        referralCode: refCode as ReferralCode,
        settings: settings as ReferralSettings,
      };
    },
  });
}
