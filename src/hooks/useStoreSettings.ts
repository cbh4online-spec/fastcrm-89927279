import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StoreSettings {
  id: string;
  workspace_id: string;
  store_name: string | null;
  store_description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  accent_color: string;
  footer_text: string | null;
  show_categories: boolean;
  show_search: boolean;
  notification_email: string | null;
  store_slug: string | null;
  custom_domain: string | null;
  prices_include_vat: boolean;
  vat_rate: number;
  created_at: string;
  updated_at: string;
}

export function useStoreSettings(workspaceId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = workspaceId || currentWorkspace?.id;

  return useQuery({
    queryKey: ["store-settings", wsId],
    queryFn: async () => {
      if (!wsId) return null;
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("workspace_id", wsId)
        .maybeSingle();
      if (error) throw error;
      return data as StoreSettings | null;
    },
    enabled: !!wsId,
  });
}

/** Public version that doesn't require WorkspaceContext */
export function usePublicStoreSettings(workspaceId: string) {
  return useQuery({
    queryKey: ["store-settings-public", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as StoreSettings | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertStoreSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<StoreSettings>) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("store_settings")
        .upsert(
          {
            workspace_id: currentWorkspace.id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Configurações da loja guardadas");
    },
    onError: (error) => {
      toast.error("Erro ao guardar: " + error.message);
    },
  });
}
