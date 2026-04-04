import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useAffiliateSettings() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["affiliate-settings", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertAffiliateSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { data, error } = await (supabase as any)
        .from("affiliate_settings")
        .upsert({ ...settings, workspace_id: currentWorkspace!.id }, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-settings"] });
      toast.success("Configurações guardadas");
    },
    onError: () => toast.error("Erro ao guardar configurações"),
  });
}

export function useAffiliatePrograms() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["affiliate-programs", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_programs")
        .select("*, affiliate_program_tiers(*), affiliate_program_rules(*)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertAffiliateProgram() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (program: Record<string, unknown>) => {
      const payload = { ...program, workspace_id: currentWorkspace!.id };
      const hasId = "id" in payload && payload.id;
      const { data, error } = hasId
        ? await (supabase as any).from("affiliate_programs").update(payload).eq("id", payload.id).select().single()
        : await (supabase as any).from("affiliate_programs").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Programa guardado");
    },
    onError: () => toast.error("Erro ao guardar programa"),
  });
}

export function useDeleteAffiliateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("affiliate_programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Programa eliminado");
    },
  });
}

export function useUpsertProgramTier() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (tier: Record<string, unknown>) => {
      const payload = { ...tier, workspace_id: currentWorkspace!.id };
      const { data, error } = payload.id
        ? await (supabase as any).from("affiliate_program_tiers").update(payload).eq("id", payload.id).select().single()
        : await (supabase as any).from("affiliate_program_tiers").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Tier guardado");
    },
  });
}

export function useUpsertProgramRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (rule: Record<string, unknown>) => {
      const payload = { ...rule, workspace_id: currentWorkspace!.id };
      const { data, error } = payload.id
        ? await (supabase as any).from("affiliate_program_rules").update(payload).eq("id", payload.id).select().single()
        : await (supabase as any).from("affiliate_program_rules").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Regra guardada");
    },
  });
}
