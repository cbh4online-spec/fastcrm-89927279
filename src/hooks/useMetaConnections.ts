import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useMetaConnections() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["meta-connections", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("meta_connections" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useMetaAssets(connectionId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["meta-assets", workspaceId, connectionId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("meta_assets" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("asset_type", { ascending: true });
      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useToggleAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, selected }: { assetId: string; selected: boolean }) => {
      const { error } = await supabase
        .from("meta_assets" as any)
        .update({ selected_for_use: selected, updated_at: new Date().toISOString() })
        .eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Ativo atualizado");
    },
  });
}

export function useMetaOAuthStart() {
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
        body: { workspace_id: workspaceId, user_id: userId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSyncAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, workspaceId }: { connectionId: string; workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-asset-sync", {
        body: { connection_id: connectionId, workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-assets"] });
      queryClient.invalidateQueries({ queryKey: ["meta-connections"] });
      toast.success("Ativos sincronizados");
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("meta_connections" as any)
        .delete()
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-connections"] });
      queryClient.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Ligação removida");
    },
  });
}
