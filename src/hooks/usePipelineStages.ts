import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface PipelineStage {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  color: string;
  expected_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStageInput {
  name: string;
  color?: string;
  position?: number;
  expected_days?: number;
}

export interface UpdateStageInput extends Partial<CreateStageInput> {
  id: string;
}

export function usePipelineStages() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["pipeline_stages", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateStageInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      // Get current max position
      const { data: stages } = await workspaceClient
        .from("pipeline_stages")
        .select("position")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: false })
        .limit(1);

      const maxPosition = stages?.[0]?.position ?? -1;

      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          color: input.color || "#6366f1",
          position: input.position ?? maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages", currentWorkspace?.id] });
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateStageInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages", currentWorkspace?.id] });
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages", currentWorkspace?.id] });
    },
  });
}

export function useReorderPipelineStages() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (stages: { id: string; position: number }[]) => {
      const updates = stages.map((stage) =>
        workspaceClient
          .from("pipeline_stages")
          .update({ position: stage.position })
          .eq("id", stage.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages", currentWorkspace?.id] });
    },
  });
}
