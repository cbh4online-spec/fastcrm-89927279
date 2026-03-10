import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface WorkspaceMetricSettings {
  conversionRatios: {
    lead_to_meeting: number;
    meeting_to_proposal: number;
    proposal_to_deal: number;
  };
  healthWeights: {
    STALLED_WEIGHT: number;
    MISSING_DATA_WEIGHT: number;
    COVERAGE_WEIGHT: number;
    COVERAGE_MAX: number;
  };
}

const DEFAULTS: WorkspaceMetricSettings = {
  conversionRatios: {
    lead_to_meeting: 0.4,
    meeting_to_proposal: 0.5,
    proposal_to_deal: 0.3,
  },
  healthWeights: {
    STALLED_WEIGHT: 40,
    MISSING_DATA_WEIGHT: 30,
    COVERAGE_WEIGHT: 30,
    COVERAGE_MAX: 3,
  },
};

const SETTING_KEYS = [
  "conversion_lead_to_meeting",
  "conversion_meeting_to_proposal",
  "conversion_proposal_to_deal",
  "health_stalled_weight",
  "health_missing_data_weight",
  "health_coverage_weight",
];

export function useWorkspaceMetricSettings(): WorkspaceMetricSettings {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data } = useQuery({
    queryKey: ["workspace-metric-settings", wid],
    enabled: !!wid,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!wid) return null;

      // Get current week's monday
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const startDate = monday.toISOString().split("T")[0];

      const { data: rows } = await supabase
        .from("performance_targets")
        .select("metric_type, target_value")
        .eq("workspace_id", wid)
        .eq("period_type", "weekly")
        .in("metric_type", SETTING_KEYS)
        .lte("period_start", startDate)
        .gte("period_end", startDate);

      if (!rows?.length) return null;

      const map: Record<string, number> = {};
      rows.forEach((r: any) => { map[r.metric_type] = r.target_value; });
      return map;
    },
  });

  if (!data) return DEFAULTS;

  return {
    conversionRatios: {
      lead_to_meeting: data["conversion_lead_to_meeting"] != null
        ? data["conversion_lead_to_meeting"] / 100
        : DEFAULTS.conversionRatios.lead_to_meeting,
      meeting_to_proposal: data["conversion_meeting_to_proposal"] != null
        ? data["conversion_meeting_to_proposal"] / 100
        : DEFAULTS.conversionRatios.meeting_to_proposal,
      proposal_to_deal: data["conversion_proposal_to_deal"] != null
        ? data["conversion_proposal_to_deal"] / 100
        : DEFAULTS.conversionRatios.proposal_to_deal,
    },
    healthWeights: {
      STALLED_WEIGHT: data["health_stalled_weight"] ?? DEFAULTS.healthWeights.STALLED_WEIGHT,
      MISSING_DATA_WEIGHT: data["health_missing_data_weight"] ?? DEFAULTS.healthWeights.MISSING_DATA_WEIGHT,
      COVERAGE_WEIGHT: data["health_coverage_weight"] ?? DEFAULTS.healthWeights.COVERAGE_WEIGHT,
      COVERAGE_MAX: DEFAULTS.healthWeights.COVERAGE_MAX,
    },
  };
}
