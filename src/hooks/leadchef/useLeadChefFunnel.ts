import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefPermissions } from "./useLeadChefPermissions";
import { LEADCHEF_STAGES, LEADCHEF_STAGE_LABELS } from "@/components/leadchef/constants";
import type { LeadChefStage } from "@/types/leadchef";

export interface LeadChefFunnelStep {
  stage: LeadChefStage;
  label: string;
  count: number;
  pctOfTop: number;
}

export interface LeadChefFunnelData {
  steps: LeadChefFunnelStep[];
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
}

const FUNNEL_ORDER: LeadChefStage[] = [
  "new",
  "to_contact",
  "in_conversation",
  "demo_scheduled",
  "demo_done",
  "proposal_decision",
  "won",
];

export function useLeadChefFunnel() {
  const { currentWorkspace } = useWorkspace();
  const perms = useLeadChefPermissions();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-funnel", wsId],
    enabled: !!wsId && perms.canViewTeam,
    queryFn: async (): Promise<LeadChefFunnelData> => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("leadchef_lead_profiles")
        .select("stage")
        .eq("workspace_id", wsId)
        .limit(5000);
      if (error) throw error;

      const counts: Record<LeadChefStage, number> = {
        new: 0, to_contact: 0, in_conversation: 0, demo_scheduled: 0,
        demo_done: 0, proposal_decision: 0, won: 0, lost: 0, reactivate_later: 0,
      };
      (data ?? []).forEach((row: any) => {
        if (row.stage in counts) counts[row.stage as LeadChefStage]++;
      });

      const top = counts[FUNNEL_ORDER[0]] || 1;
      const steps = FUNNEL_ORDER.map((s) => ({
        stage: s,
        label: LEADCHEF_STAGE_LABELS[s],
        count: counts[s],
        pctOfTop: Math.round((counts[s] / top) * 100),
      }));

      const total = LEADCHEF_STAGES.reduce((acc, s) => acc + counts[s], 0);
      const won = counts.won;
      const lost = counts.lost;
      const conversionRate = total ? Math.round((won / total) * 100) : 0;

      return { steps, total, won, lost, conversionRate };
    },
  });
}
