import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface IntelligencePanelData {
  total_open: number;
  health_distribution: { HEALTHY: number; WATCH: number; AT_RISK: number };
  avg_health_score: number;
  top_risks: Array<{
    deal_id: string;
    deal_title: string;
    reason: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    health_score: number;
  }>;
  recommended_actions: Array<{
    deal_id: string;
    deal_title: string;
    action: string;
    type: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
  data_quality: {
    avg_completeness: number;
    deals_missing_value: number;
    deals_missing_close_date: number;
  };
  computed_at: string;
}

export function useIntelligencePanel() {
  const { currentWorkspace } = useWorkspace();

  const query = useQuery<IntelligencePanelData>({
    queryKey: ["intelligence-panel", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("intelligence-panel", {
        headers: { "X-Workspace-Id": currentWorkspace!.id },
        body: {},
      });
      if (error) throw error;
      return data as IntelligencePanelData;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
