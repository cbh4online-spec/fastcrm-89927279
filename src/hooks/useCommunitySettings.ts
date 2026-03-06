import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface CommunitySettings {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  slug: string | null;
  is_private: boolean;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  newsletter_frequency: string;
  membership_questions_enabled: boolean;
  subscription_type: string;
  subscription_price: number | null;
  theme_preset: string | null;
  visible_tabs: Record<string, boolean> | null;
  category: string | null;
  custom_domain: string | null;
  is_discoverable: boolean;
  allow_anonymous_profiles: boolean;
  default_profile_private: boolean;
  force_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityLink {
  id: string;
  workspace_id: string;
  title: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export function useCommunitySettings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["community-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("community_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as CommunitySettings | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertCommunitySettings(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CommunitySettings>) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("community_settings")
        .upsert({ workspace_id: workspaceId, ...values }, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-settings"] });
      toast.success("Definições guardadas!");
      console.log('[COMMUNITY-FASTCLUB] SETTINGS_UPDATED');
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'COMMUNITY.SETTINGS_UPDATED',
          entity_kind: 'community_settings',
          entity_id: workspaceId,
          source_module: 'community-fastclub',
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao guardar definições");
      console.error('[COMMUNITY-FASTCLUB] SETTINGS_UPDATE_FAILED', (err as Error).message);
    },
  });
}

export function useCommunityLinks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["community-links", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("community_links")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return data as CommunityLink[];
    },
    enabled: !!workspaceId,
  });
}

export function useManageCommunityLinks(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const addLink = useMutation({
    mutationFn: async ({ title, url }: { title: string; url: string }) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { error } = await supabase
        .from("community_links")
        .insert({ workspace_id: workspaceId, title, url });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-links"] });
      toast.success("Link adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar link"),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-links"] });
      toast.success("Link removido!");
    },
    onError: () => toast.error("Erro ao remover link"),
  });

  return { addLink, removeLink };
}
