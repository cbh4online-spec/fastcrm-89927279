import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function useReferralProgram(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-referral-program", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await (supabase as any)
        .from("c2c_referral_programs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertReferralProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (program: any) => {
      const { error } = await (supabase as any)
        .from("c2c_referral_programs")
        .upsert(program, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-referral-program", v.workspace_id] });
      toast.success("Programa de referências atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyReferrals(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-referrals", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_referrals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ programId, workspaceId, email }: { programId: string; workspaceId: string; email?: string }) => {
      if (!user) throw new Error("Necessário login");
      const { data, error } = await (supabase as any)
        .from("c2c_referrals")
        .insert({
          program_id: programId,
          workspace_id: workspaceId,
          referrer_user_id: user.id,
          referral_code: generateReferralCode(),
          referred_email: email || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-my-referrals", v.workspaceId] });
      toast.success("Convite criado!");
      console.log('[MARKETPLACE] Referral created');
    },
    onError: (e: Error) => {
      console.warn('[MARKETPLACE] REFERRAL_CREATE_FAILED', e.message);
      toast.error(e.message);
    },
  });
}

export function useMyReferralAttributions(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-referral-attributions", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_referral_attributions")
        .select("*, c2c_referrals!inner(referrer_user_id)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((a: any) => a.c2c_referrals?.referrer_user_id === user.id);
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useAllReferrals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-all-referrals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_referrals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}
