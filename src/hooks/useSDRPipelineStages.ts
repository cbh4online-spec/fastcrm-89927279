import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SDRPipelineStage {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  key: string;
  label: string;
  position: number;
  color: string;
  icon: string;
  is_terminal: boolean;
  is_negative: boolean;
  created_at: string;
  updated_at: string;
}

export function useSDRPipelineStages(campaignId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["sdr-pipeline-stages", workspaceId, campaignId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Try campaign-specific stages first, fallback to workspace global (campaign_id IS NULL)
      let query = supabase
        .from("sdr_pipeline_stages" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      } else {
        query = query.is("campaign_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If campaign has no stages, fallback to global
      if (campaignId && (!data || data.length === 0)) {
        const { data: globalData, error: globalError } = await supabase
          .from("sdr_pipeline_stages" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .is("campaign_id", null)
          .order("position", { ascending: true });
        if (globalError) throw globalError;
        return (globalData || []) as unknown as SDRPipelineStage[];
      }

      return (data || []) as unknown as SDRPipelineStage[];
    },
    enabled: !!workspaceId,
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SDRPipelineStage> & { id: string }) => {
      const { error } = await supabase
        .from("sdr_pipeline_stages" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-pipeline-stages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createStage = useMutation({
    mutationFn: async (input: { key: string; label: string; position: number; color?: string; icon?: string; campaign_id?: string | null }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("sdr_pipeline_stages" as any)
        .insert({
          workspace_id: workspaceId,
          campaign_id: input.campaign_id ?? null,
          key: input.key,
          label: input.label,
          position: input.position,
          color: input.color || "gray-500",
          icon: input.icon || "Circle",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-pipeline-stages"] });
      toast.success("Fase criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sdr_pipeline_stages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-pipeline-stages"] });
      toast.success("Fase eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, i) =>
        supabase
          .from("sdr_pipeline_stages" as any)
          .update({ position: i })
          .eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-pipeline-stages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seedDefaults = useMutation({
    mutationFn: async (targetCampaignId?: string | null) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.rpc("seed_sdr_default_stages" as any, {
        p_workspace_id: workspaceId,
        p_campaign_id: targetCampaignId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-pipeline-stages"] });
      toast.success("Fases padrão criadas");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Active (non-terminal, non-negative) stages for pipeline flow
  const activeStages = stages.filter((s) => !s.is_negative);
  const terminalStages = stages.filter((s) => s.is_terminal);

  return {
    stages,
    activeStages,
    terminalStages,
    isLoading,
    updateStage,
    createStage,
    deleteStage,
    reorderStages,
    seedDefaults,
  };
}
