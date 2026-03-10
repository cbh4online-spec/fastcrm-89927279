import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface FunnelInstance {
  id: string;
  workspace_id: string;
  name: string;
  funnel_template_id: string | null;
  vertical_id: string | null;
  page_template_id: string | null;
  capture_type_id: string | null;
  objective: string | null;
  status: string;
  preview_url: string | null;
  public_url: string | null;
  primary_domain_id: string | null;
  path: string | null;
  slug: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaptureType {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
}

export function useCaptureTypes() {
  return useQuery({
    queryKey: ["capture-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capture_types")
        .select("*")
        .order("label");
      if (error) throw error;
      return data as CaptureType[];
    },
  });
}

export function useFunnelInstances() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["funnel-instances", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("funnel_instances")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FunnelInstance[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateFunnelInstance() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<FunnelInstance> & { name: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("funnel_instances")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FunnelInstance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnel-instances"] });
      toast.success("Funil criado com sucesso");
    },
    onError: (e) => toast.error("Erro ao criar funil: " + e.message),
  });
}

export interface CustomDomain {
  id: string;
  workspace_id: string;
  domain: string;
  subdomain: string | null;
  root_domain: string | null;
  verification_status: string;
  ssl_status: string;
  provider: string | null;
  dns_instructions_json: Record<string, unknown>;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomDomains() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["custom-domains", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("custom_domains")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomDomain[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateCustomDomain() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { domain: string; subdomain?: string; root_domain?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("custom_domains")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustomDomain;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Domínio adicionado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteCustomDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Domínio removido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export interface AIFunnelSession {
  id: string;
  workspace_id: string;
  mode: string;
  user_prompt: string | null;
  parsed_brief_json: Record<string, unknown>;
  ai_recommendation_json: Record<string, unknown>;
  selected_configuration_json: Record<string, unknown>;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreateAIFunnelSession() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { mode: string; user_prompt?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("ai_funnel_sessions")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIFunnelSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-funnel-sessions"] });
    },
  });
}
