import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function generateAffiliateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "AFF-";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function useAffiliateProgram(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-affiliate-program", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await (supabase as any)
        .from("c2c_affiliate_programs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertAffiliateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (program: any) => {
      const { error } = await (supabase as any)
        .from("c2c_affiliate_programs")
        .upsert(program, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-affiliate-program", v.workspace_id] });
      toast.success("Programa de afiliados atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyAffiliate(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-affiliate", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      const { data, error } = await (supabase as any)
        .from("c2c_affiliates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useJoinAffiliateProgram() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ programId, workspaceId }: { programId: string; workspaceId: string }) => {
      if (!user) throw new Error("Necessário login");
      const { data, error } = await (supabase as any)
        .from("c2c_affiliates")
        .insert({
          program_id: programId,
          workspace_id: workspaceId,
          user_id: user.id,
          affiliate_code: generateAffiliateCode(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-my-affiliate", v.workspaceId] });
      toast.success("Inscrito como afiliado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAffiliateLinks(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-affiliate-links", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_affiliate_links")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

export function useCreateAffiliateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: any) => {
      const { error } = await (supabase as any)
        .from("c2c_affiliate_links")
        .insert(link);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-affiliate-links", v.affiliate_id] });
      toast.success("Link criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAffiliateAttributions(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-affiliate-attributions", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_affiliate_attributions")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

export function useAffiliateClicks(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-affiliate-clicks", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_affiliate_clicks")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

export function useAllAffiliates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-all-affiliates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_affiliates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useAllAttributions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-all-attributions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_affiliate_attributions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}
