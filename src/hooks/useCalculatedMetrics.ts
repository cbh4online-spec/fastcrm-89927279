import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CalculatedMetric {
  metric_id: string;
  metric_name: string;
  metric_type: string;
  formula?: string;
  unit?: string;
  icon?: string;
  color?: string;
  current_value: number;
  target_value: number | null;
  target_period: string | null;
  previous_value: number | null;
  pct_of_target: number | null;
  pct_change: number | null;
  error?: string;
}

export function useCalculatedMetrics(metricId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["calculated-metrics", wid, metricId],
    queryFn: async (): Promise<CalculatedMetric[]> => {
      const { data, error } = await supabase.functions.invoke("calculate-pipeline-metrics", {
        body: { workspace_id: wid, metric_id: metricId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.results as CalculatedMetric[];
    },
    enabled: !!wid,
    staleTime: 60_000,
    retry: 1,
  });
}
