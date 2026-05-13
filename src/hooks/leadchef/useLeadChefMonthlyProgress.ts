import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { monthRange, startOfMonthIso } from "@/utils/leadchef/goals";
import type { LeadChefStage, LeadChefAppointment } from "@/types/leadchef";

export interface LeadChefMonthlyProgressData {
  leadsCreated: number;
  contactsMade: number;
  demosScheduled: number;
  demosCompleted: number;
  proposals: number;
  salesWon: number;
  referrals: number;
  recruitments: number;
  postSaleVisits: number;
  recruitmentEntries: number;
  incomeEstimated: number;
  pendingActions: number;
  overdueActions: number;
  stageDistribution: Record<LeadChefStage, number>;
}

const ZERO_DISTRIBUTION: Record<LeadChefStage, number> = {
  new: 0,
  to_contact: 0,
  in_conversation: 0,
  demo_scheduled: 0,
  demo_done: 0,
  proposal_decision: 0,
  won: 0,
  lost: 0,
  reactivate_later: 0,
};

const CONTACT_TYPES = new Set(["phone_call", "whatsapp", "follow_up"]);

export function useLeadChefMonthlyProgress(periodMonth?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const month = periodMonth ?? startOfMonthIso();

  return useQuery({
    queryKey: ["leadchef-monthly-progress", workspaceId, user?.id, month],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefMonthlyProgressData> => {
      const empty: LeadChefMonthlyProgressData = {
        leadsCreated: 0,
        contactsMade: 0,
        demosScheduled: 0,
        demosCompleted: 0,
        proposals: 0,
        salesWon: 0,
        referrals: 0,
        recruitments: 0,
        postSaleVisits: 0,
        recruitmentEntries: 0,
        incomeEstimated: 0,
        pendingActions: 0,
        overdueActions: 0,
        stageDistribution: { ...ZERO_DISTRIBUTION },
      };
      if (!workspaceId) return empty;

      const { start, end } = monthRange(month);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const now = new Date();

      // 1. leadchef_lead_profiles do workspace (todas, para distribuição)
      const profilesRes = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select("id,stage,created_at,next_action_at,next_action_type")
        .eq("workspace_id", workspaceId)
        .limit(2000);
      if (profilesRes.error) throw profilesRes.error;
      const profiles = (profilesRes.data ?? []) as Array<{
        id: string;
        stage: LeadChefStage;
        created_at: string;
        next_action_at: string | null;
        next_action_type: string | null;
      }>;

      const distribution: Record<LeadChefStage, number> = { ...ZERO_DISTRIBUTION };
      for (const p of profiles) {
        if (distribution[p.stage] !== undefined) distribution[p.stage] += 1;
      }

      const inMonth = (iso: string | null) => {
        if (!iso) return false;
        const d = new Date(iso);
        return d >= start && d < end;
      };

      const leadsCreated = profiles.filter((p) => inMonth(p.created_at)).length;
      const salesWon = profiles.filter((p) => p.stage === "won" && inMonth(p.created_at)).length
        || profiles.filter((p) => p.stage === "won").length; // fallback se não houver won_at

      const proposals = profiles.filter(
        (p) => p.stage === "proposal_decision"
      ).length;

      const pendingActions = profiles.filter(
        (p) => p.next_action_at && new Date(p.next_action_at) >= now
      ).length;
      const overdueActions = profiles.filter(
        (p) =>
          p.next_action_at &&
          new Date(p.next_action_at) < now &&
          p.stage !== "won" &&
          p.stage !== "lost"
      ).length;

      // 2. leadchef_appointments do mês
      const apptsRes = await (supabase as any)
        .from("leadchef_appointments")
        .select("id,type,status,scheduled_at,completed_at,outcome")
        .eq("workspace_id", workspaceId)
        .gte("scheduled_at", startIso)
        .lt("scheduled_at", endIso)
        .limit(2000);
      if (apptsRes.error) throw apptsRes.error;
      const appts = (apptsRes.data ?? []) as Array<Pick<LeadChefAppointment, "id" | "type" | "status" | "scheduled_at" | "completed_at" | "outcome">>;

      const demosScheduled = appts.filter((a) => a.type === "demo").length;
      const demosCompleted = appts.filter((a) => a.type === "demo" && a.status === "completed").length;
      const contactsMade = appts.filter(
        (a) => CONTACT_TYPES.has(a.type as string) && a.status === "completed"
      ).length;
      const recruitments = appts.filter((a) => a.type === "recruitment").length;
      const recruitmentEntries = appts.filter(
        (a) => a.type === "recruitment" && a.status === "completed"
      ).length;
      const postSaleVisits = appts.filter(
        (a) => a.type === "post_sale_visit" && a.status === "completed"
      ).length;
      const apptProposals = appts.filter((a) => a.type === "proposal").length;
      const apptWon = appts.filter((a) => a.outcome === "won").length;

      // 3. leadchef_referrals do mês
      let referrals = 0;
      try {
        const refRes = await (supabase as any)
          .from("leadchef_referrals")
          .select("id,created_at")
          .eq("workspace_id", workspaceId)
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .limit(1000);
        if (!refRes.error) referrals = (refRes.data ?? []).length;
      } catch {
        referrals = 0;
      }

      return {
        leadsCreated,
        contactsMade,
        demosScheduled,
        demosCompleted,
        proposals: Math.max(proposals, apptProposals),
        salesWon: Math.max(salesWon, apptWon),
        referrals,
        recruitments,
        postSaleVisits,
        recruitmentEntries,
        incomeEstimated: 0,
        pendingActions,
        overdueActions,
        stageDistribution: distribution,
      };
    },
  });
}
