import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineIntelligence {
  pipeline_id: string;
  name: string;
  health_index: number;
  risk_ratio: number;
  forecast_confidence: number;
  velocity_index: number;
  revenue_share: number;
  deal_count: number;
  total_value: number;
}

export interface MultiPipelineIntelligence {
  pipelines: PipelineIntelligence[];
  insights: string[];
  generated_at: string;
}

export function useMultiPipelineIntelligence() {
  const { currentWorkspace } = useWorkspace();

  return useQuery<MultiPipelineIntelligence>({
    queryKey: ["multi-pipeline-intelligence", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return { pipelines: [], insights: [], generated_at: "" };

      const { data, error } = await supabase.functions.invoke("multi-pipeline-intelligence", {
        headers: { "X-Workspace-Id": currentWorkspace.id },
        body: { workspace_id: currentWorkspace.id },
      });

      if (error) throw error;
      return data as MultiPipelineIntelligence;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
