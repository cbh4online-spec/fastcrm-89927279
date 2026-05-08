import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefPermissions } from "./useLeadChefPermissions";
import { getPeriodRange, type LeadChefPeriod } from "@/utils/leadchef/period";
import type { LeadChefStage } from "@/types/leadchef";

export interface LeadChefAgentOverview {
  leadsCreated: number;
  leadsContacted: number;
  actionsCompleted: number;
  demosScheduled: number;
  demosCompleted: number;
  sales: number;
  referrals: number;
  recruitments: number;
  conversionLeadToDemo: number;
  conversionDemoToSale: number;
  overdueActions: number;
  upcomingAppointments: Array<{ id: string; title: string | null; type: string; scheduled_at: string }>;
  recentLeads: Array<{ id: string; name: string; stage: LeadChefStage; updated_at: string }>;
}

export function useLeadChefAgentOverview(userId?: string, period: LeadChefPeriod = "month") {
  const { currentWorkspace } = useWorkspace();
  const perms = useLeadChefPermissions();
  const wsId = currentWorkspace?.id;
  const targetUserId = userId ?? perms.userId ?? undefined;
  const isSelf = targetUserId === perms.userId;
  const enabled = !!wsId && !!targetUserId && (isSelf || perms.canViewTeam);

  return useQuery({
    queryKey: ["leadchef-agent-overview", wsId, targetUserId, period],
    enabled,
    queryFn: async (): Promise<LeadChefAgentOverview> => {
      const { from, to } = getPeriodRange(period);
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const nowIso = new Date().toISOString();
      const sb = supabase as any;

      const [leadsRes, profilesRes, apptsRes, refsRes, recruitsRes] = await Promise.all([
        sb.from("leads")
          .select("id, name, assigned_to, created_by, created_at")
          .eq("workspace_id", wsId)
          .or(`assigned_to.eq.${targetUserId},created_by.eq.${targetUserId}`)
          .limit(2000),
        sb.from("leadchef_lead_profiles")
          .select("lead_id, stage, updated_at, last_contact_at, lead:leads(id,name)")
          .eq("workspace_id", wsId).limit(2000),
        sb.from("leadchef_appointments")
          .select("id, title, type, status, scheduled_at, completed_at, created_by")
          .eq("workspace_id", wsId)
          .eq("created_by", targetUserId).limit(2000),
        sb.from("leadchef_referrals")
          .select("id, created_at")
          .eq("workspace_id", wsId)
          .eq("created_by", targetUserId).limit(2000),
        sb.from("leadchef_client_profiles")
          .select("id, potential_recruitment, updated_at")
          .eq("workspace_id", wsId)
          .eq("created_by", targetUserId)
          .eq("potential_recruitment", true).limit(1000),
      ]);

      const leads = (leadsRes.data ?? []) as any[];
      const ownedIds = new Set(leads.map((l) => l.id));
      const profiles = (profilesRes.data ?? []).filter((p: any) => ownedIds.has(p.lead_id)) as any[];
      const appts = (apptsRes.data ?? []) as any[];
      const referrals = (refsRes.data ?? []) as any[];
      const recruits = (recruitsRes.data ?? []) as any[];

      const inPeriod = (iso?: string | null) => !!iso && iso >= fromIso && iso <= toIso;

      const leadsCreated = leads.filter((l) => inPeriod(l.created_at)).length;
      const leadsContacted = profiles.filter((p) => inPeriod(p.last_contact_at)).length;
      const actionsCompleted = appts.filter(
        (a) => a.status === "completed" && inPeriod(a.completed_at ?? a.scheduled_at)
      ).length;
      const demosScheduled = appts.filter((a) => a.type === "demo" && inPeriod(a.scheduled_at)).length;
      const demosCompleted = appts.filter(
        (a) => a.type === "demo" && a.status === "completed" && inPeriod(a.completed_at ?? a.scheduled_at)
      ).length;
      const sales = profiles.filter((p) => p.stage === "won" && inPeriod(p.updated_at)).length;
      const refsCount = referrals.filter((r) => inPeriod(r.created_at)).length;
      const recruitments = recruits.filter((r) => inPeriod(r.updated_at)).length;
      const overdueActions = appts.filter(
        (a) => a.status === "scheduled" && a.scheduled_at && a.scheduled_at < nowIso
      ).length;

      const upcoming = appts
        .filter((a) => a.status === "scheduled" && a.scheduled_at && a.scheduled_at >= nowIso)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .slice(0, 5)
        .map((a) => ({ id: a.id, title: a.title, type: a.type, scheduled_at: a.scheduled_at }));

      const recentLeads = profiles
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        .slice(0, 8)
        .map((p) => ({
          id: p.lead?.id ?? p.lead_id,
          name: p.lead?.name ?? "Lead",
          stage: p.stage as LeadChefStage,
          updated_at: p.updated_at,
        }));

      return {
        leadsCreated,
        leadsContacted,
        actionsCompleted,
        demosScheduled,
        demosCompleted,
        sales,
        referrals: refsCount,
        recruitments,
        conversionLeadToDemo: leadsCreated ? Math.round((demosScheduled / leadsCreated) * 100) : 0,
        conversionDemoToSale: demosCompleted ? Math.round((sales / demosCompleted) * 100) : 0,
        overdueActions,
        upcomingAppointments: upcoming,
        recentLeads,
      };
    },
  });
}
