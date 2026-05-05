import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import type {
  LeadChefTodayData,
  LeadChefTodayAction,
  LeadChefStage,
  LeadChefActivityType,
} from "@/types/leadchef";

const FINAL_STAGES: LeadChefStage[] = ["won", "lost"];

interface Row {
  id: string;
  lead_id: string;
  stage: LeadChefStage;
  next_action_type: LeadChefActivityType | null;
  next_action_at: string | null;
  next_action_note: string | null;
  created_at: string;
  lead: { id: string; name: string; phone: string | null; last_contact_at: string | null } | null;
}

function toAction(r: Row): LeadChefTodayAction {
  return {
    id: r.id,
    leadId: r.lead_id,
    leadName: r.lead?.name ?? "Lead",
    type: r.next_action_type,
    scheduledAt: r.next_action_at,
    note: r.next_action_note,
    stage: r.stage,
    phone: r.lead?.phone ?? null,
  };
}

export function useLeadChefToday() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-today", workspaceId, user?.id],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefTodayData> => {
      const empty: LeadChefTodayData = {
        overdueActions: [],
        todayActions: [],
        scheduledDemos: [],
        newLeadsWithoutContact: [],
        pendingProposals: [],
        monthlyProgress: {
          salesDone: 0,
          salesGoal: 0,
          demosDone: 0,
          demosGoal: 0,
          newLeads: 0,
          leadsGoal: 0,
          percent: 0,
        },
      };
      if (!workspaceId) return empty;

      const { data, error } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select(
          "id,lead_id,stage,next_action_type,next_action_at,next_action_note,created_at,lead:leads(id,name,phone,last_contact_at)"
        )
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      const rows = ((data ?? []) as Row[]).filter((r) => r.lead);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const isToday = (iso: string | null) => {
        if (!iso) return false;
        const d = new Date(iso);
        return d >= startOfDay && d < endOfDay;
      };
      const isOverdue = (iso: string | null) => {
        if (!iso) return false;
        return new Date(iso) < startOfDay;
      };

      const overdueActions = rows
        .filter((r) => !FINAL_STAGES.includes(r.stage) && isOverdue(r.next_action_at))
        .map(toAction);

      const todayActions = rows
        .filter((r) => !FINAL_STAGES.includes(r.stage) && isToday(r.next_action_at))
        .map(toAction);

      const scheduledDemos = rows
        .filter((r) => r.stage === "demo_scheduled")
        .map(toAction);

      const newLeadsWithoutContact = rows
        .filter(
          (r) =>
            (r.stage === "new" || r.stage === "to_contact") &&
            !r.lead?.last_contact_at
        )
        .map(toAction);

      const pendingProposals = rows
        .filter((r) => r.stage === "proposal_decision")
        .map(toAction);

      // Progresso mensal
      const newLeadsThisMonth = rows.filter(
        (r) => new Date(r.created_at) >= startOfMonth
      ).length;
      const salesDone = rows.filter((r) => r.stage === "won").length;
      const demosDone = rows.filter(
        (r) => r.stage === "demo_done" || r.stage === "won"
      ).length;

      // Goal do utilizador para o mês corrente
      let goalRow: any = null;
      if (user?.id) {
        const monthIso = startOfMonth.toISOString().slice(0, 10);
        const { data: g } = await (supabase as any)
          .from("leadchef_goals")
          .select("leads_goal,demos_goal,sales_goal")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .eq("period_month", monthIso)
          .limit(1)
          .maybeSingle();
        goalRow = g;
      }

      const salesGoal = goalRow?.sales_goal ?? 0;
      const demosGoal = goalRow?.demos_goal ?? 0;
      const leadsGoal = goalRow?.leads_goal ?? 0;
      const percent = salesGoal > 0 ? Math.min(100, Math.round((salesDone / salesGoal) * 100)) : 0;

      return {
        overdueActions,
        todayActions,
        scheduledDemos,
        newLeadsWithoutContact,
        pendingProposals,
        monthlyProgress: {
          salesDone,
          salesGoal,
          demosDone,
          demosGoal,
          newLeads: newLeadsThisMonth,
          leadsGoal,
          percent,
        },
      };
    },
  });
}
