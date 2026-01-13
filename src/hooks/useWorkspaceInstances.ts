import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WorkspaceStatus = "active" | "suspended" | "inactive" | "pending";

export interface WorkspaceInstance {
  id: string;
  workspace_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  status: WorkspaceStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  workspaces?: {
    name: string;
    slug: string;
  };
}

export function useWorkspaceInstances() {
  const queryClient = useQueryClient();

  const { data: instances, isLoading, error } = useQuery({
    queryKey: ["workspace-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_instances")
        .select(`
          *,
          workspaces (name, slug)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WorkspaceInstance[];
    },
  });

  const createInstance = useMutation({
    mutationFn: async (instance: {
      workspace_id: string;
      supabase_url: string;
      supabase_anon_key: string;
      status?: WorkspaceStatus;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("workspace_instances")
        .insert({
          workspace_id: instance.workspace_id,
          supabase_url: instance.supabase_url,
          supabase_anon_key: instance.supabase_anon_key,
          status: instance.status,
          metadata: instance.metadata as unknown as Record<string, never>,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-instances"] });
      toast.success("Instância criada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
  });

  const updateInstance = useMutation({
    mutationFn: async ({
      id,
      workspace_id,
      supabase_url,
      supabase_anon_key,
      status,
      metadata,
    }: Partial<WorkspaceInstance> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (workspace_id !== undefined) updateData.workspace_id = workspace_id;
      if (supabase_url !== undefined) updateData.supabase_url = supabase_url;
      if (supabase_anon_key !== undefined) updateData.supabase_anon_key = supabase_anon_key;
      if (status !== undefined) updateData.status = status;
      if (metadata !== undefined) updateData.metadata = metadata;

      const { data, error } = await supabase
        .from("workspace_instances")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-instances"] });
      toast.success("Instância atualizada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    },
  });

  const deleteInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_instances")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-instances"] });
      toast.success("Instância removida com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao remover instância: ${error.message}`);
    },
  });

  return {
    instances: instances ?? [],
    isLoading,
    error,
    createInstance,
    updateInstance,
    deleteInstance,
  };
}
