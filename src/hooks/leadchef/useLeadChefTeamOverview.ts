import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefPermissions } from "./useLeadChefPermissions";
import { useLeadChefTeamMembers, type LeadChefTeamMember } from "./useLeadChefTeamMembers";
import { getPeriodRange, type LeadChefPeriod } from "@/utils/leadchef/period";
import type { LeadChefStage } from "@/types/leadchef";

export interface LeadChefAgentSummary {
  member: LeadChefTeamMember;
  leadsCreated: number;
  activeLeads: number;
  demosScheduled: number;
  demosCompleted: number;
  salesWon: number;
  referrals: number;
  overdueActions: number;
}

export interface LeadChefTeamOverview {
  totalLeadsCreated: number;
  totalActiveLeads: number;
  totalActionsCompleted: number;
  totalOverdueActions: number;
  totalDemosScheduled: number;
  totalDemosCompleted: number;
  totalSalesWon: number;
  totalReferrals: number;
  totalRecruitmentPotentials: number;
  conversionLeadToDemo: number;
  conversionDemoToSale: number;
  stageDistribution: Record<LeadChefStage, number>;
  agentSummaries: LeadChefAgentSummary[];
}

const EMPTY_DISTRIBUTION: Record<LeadChefStage, number> = {
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

export function useLeadChefTeamOverview(period: LeadChefPeriod = "month") {
  const { currentWorkspace } = useWorkspace();
  const perms = useLeadChefPermissions();
  const { data: members } = useLeadChefTeamMembers();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-team-overview", wsId, period, members?.length ?? 0],
    enabled: !!wsId && perms.canViewTeam && !!members,
    queryFn: async (): Promise<LeadChefTeamOverview> => {
      const { from, to } = getPeriodRange(period);
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const nowIso = new Date().toISOString();

      const sb = supabase as any;

      const [leadsRes, profilesRes, apptsRes, refsRes, clientsRes] = await Promise.all([
        sb.from("leads")
          .select("id, assigned_to, created_by, created_at")
          .eq("workspace_id", wsId).limit(5000),
        sb.from("leadchef_lead_profiles")
          .select("lead_id, stage, created_by, next_action_at, updated_at")
          .eq("workspace_id", wsId).limit(5000),
        sb.from("leadchef_appointments")
          .select("id, type, status, scheduled_at, completed_at, created_by")
          .eq("workspace_id", wsId).limit(5000),
        sb.from("leadchef_referrals")
          .select("id, created_by, created_at")
          .eq("workspace_id", wsId).limit(5000),
        sb.from("leadchef_client_profiles")
          .select("id, potential_recruitment, created_by, updated_at")
          .eq("workspace_id", wsId).limit(5000),
      ]);

      const leads = (leadsRes.data ?? []) as any[];
      const profiles = (profilesRes.data ?? []) as any[];
      const appts = (apptsRes.data ?? []) as any[];
      const referrals = (refsRes.data ?? []) as any[];
      const clients = (clientsRes.data ?? []) as any[];

      const ownerMap = new Map<string, string | null>();
      for (const l of leads) ownerMap.set(l.id, l.assigned_to ?? l.created_by ?? null);

      const profileByLeadId = new Map<string, any>();
      for (const p of profiles) profileByLeadId.set(p.lead_id, p);

      // Stage distribution
      const stageDistribution: Record<LeadChefStage, number> = { ...EMPTY_DISTRIBUTION };
      for (const p of profiles) {
        if (p.stage && stageDistribution[p.stage as LeadChefStage] !== undefined) {
          stageDistribution[p.stage as LeadChefStage]++;
        }
      }

      const inPeriod = (iso?: string | null) => !!iso && iso >= fromIso && iso <= toIso;

      const totalLeadsCreated = leads.filter((l) => inPeriod(l.created_at)).length;
      const totalActiveLeads = profiles.filter(
        (p) => !["won", "lost"].includes(p.stage)
      ).length;
      const totalDemosScheduled = appts.filter(
        (a) => a.type === "demo" && inPeriod(a.scheduled_at)
      ).length;
      const totalDemosCompleted = appts.filter(
        (a) => a.type === "demo" && a.status === "completed" && inPeriod(a.completed_at ?? a.scheduled_at)
      ).length;
      const totalActionsCompleted = appts.filter(
        (a) => a.status === "completed" && inPeriod(a.completed_at ?? a.scheduled_at)
      ).length;
      const totalOverdueActions = appts.filter(
        (a) => a.status === "scheduled" && a.scheduled_at && a.scheduled_at < nowIso
      ).length;
      const totalSalesWon = profiles.filter(
        (p) => p.stage === "won" && inPeriod(p.updated_at)
      ).length;
      const totalReferrals = referrals.filter((r) => inPeriod(r.created_at)).length;
      const totalRecruitmentPotentials = clients.filter(
        (c) => c.potential_recruitment && inPeriod(c.updated_at)
      ).length;

      const conversionLeadToDemo = totalLeadsCreated
        ? Math.round((totalDemosScheduled / totalLeadsCreated) * 100)
        : 0;
      const conversionDemoToSale = totalDemosCompleted
        ? Math.round((totalSalesWon / totalDemosCompleted) * 100)
        : 0;

      // Agent summaries
      const agentSummaries: LeadChefAgentSummary[] = (members ?? []).map((m) => {
        const userId = m.userId;
        const ownedLeadIds = new Set(
          leads.filter((l) => (l.assigned_to ?? l.created_by) === userId).map((l) => l.id)
        );
        const userProfiles = profiles.filter((p) => ownedLeadIds.has(p.lead_id) || p.created_by === userId);
        const userAppts = appts.filter((a) => a.created_by === userId);

        return {
          member: m,
          leadsCreated: leads.filter((l) => l.created_by === userId && inPeriod(l.created_at)).length,
          activeLeads: userProfiles.filter((p) => !["won", "lost"].includes(p.stage)).length,
          demosScheduled: userAppts.filter((a) => a.type === "demo" && inPeriod(a.scheduled_at)).length,
          demosCompleted: userAppts.filter(
            (a) => a.type === "demo" && a.status === "completed" && inPeriod(a.completed_at ?? a.scheduled_at)
          ).length,
          salesWon: userProfiles.filter((p) => p.stage === "won" && inPeriod(p.updated_at)).length,
          referrals: referrals.filter((r) => r.created_by === userId && inPeriod(r.created_at)).length,
          overdueActions: userAppts.filter(
            (a) => a.status === "scheduled" && a.scheduled_at && a.scheduled_at < nowIso
          ).length,
        };
      });

      return {
        totalLeadsCreated,
        totalActiveLeads,
        totalActionsCompleted,
        totalOverdueActions,
        totalDemosScheduled,
        totalDemosCompleted,
        totalSalesWon,
        totalReferrals,
        totalRecruitmentPotentials,
        conversionLeadToDemo,
        conversionDemoToSale,
        stageDistribution,
        agentSummaries,
      };
    },
  });
}
