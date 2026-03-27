import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { MetricPeriod, MetricSnapshot } from "./usePipelineMetrics";

const sb = supabase as any;

interface UseMetricSnapshotsOpts {
  metricId?: string;
  period?: MetricPeriod;
  limit?: number;
}

export function useMetricSnapshots({ metricId, period = "daily", limit = 30 }: UseMetricSnapshotsOpts = {}) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["pipeline-metric-snapshots", wid, metricId, period, limit],
    queryFn: async () => {
      let q = sb.from("pipeline_metric_snapshots").select("*").eq("workspace_id", wid).eq("period", period).order("period_start", { ascending: false }).limit(limit);
      if (metricId) q = q.eq("metric_id", metricId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MetricSnapshot[];
    },
    enabled: !!wid,
    staleTime: 60_000,
  });
}
