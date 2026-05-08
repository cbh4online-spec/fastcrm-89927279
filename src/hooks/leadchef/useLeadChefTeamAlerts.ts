import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefPermissions } from "./useLeadChefPermissions";
import { useLeadChefTeamMembers } from "./useLeadChefTeamMembers";

export type LeadChefTeamAlertSeverity = "info" | "warning" | "critical";

export interface LeadChefTeamAlert {
  id: string;
  type:
    | "no_next_action"
    | "overdue_action"
    | "demo_no_followup"
    | "client_no_post_sale"
    | "referral_no_contact";
  severity: LeadChefTeamAlertSeverity;
  title: string;
  description: string;
  userId: string | null;
  userName: string | null;
  entityType: "lead" | "client" | "referral" | "appointment";
  entityId: string;
  createdAt: string;
  actionHref: string;
}

export function useLeadChefTeamAlerts() {
  const { currentWorkspace } = useWorkspace();
  const perms = useLeadChefPermissions();
  const { data: members } = useLeadChefTeamMembers();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-team-alerts", wsId, members?.length ?? 0],
    enabled: !!wsId && perms.canViewTeam,
    queryFn: async (): Promise<LeadChefTeamAlert[]> => {
      const sb = supabase as any;
      const nowIso = new Date().toISOString();
      const memberMap = new Map((members ?? []).map((m) => [m.userId, m.name]));
      const ownerName = (uid?: string | null) => (uid ? memberMap.get(uid) ?? null : null);

      const [profilesRes, apptsRes, refsRes, clientsRes, leadsRes] = await Promise.all([
        sb.from("leadchef_lead_profiles")
          .select("lead_id, stage, next_action_at, updated_at, last_contact_at, lead:leads(id,name,assigned_to,created_by)")
          .eq("workspace_id", wsId).limit(3000),
        sb.from("leadchef_appointments")
          .select("id, type, status, scheduled_at, lead_id, created_by, title")
          .eq("workspace_id", wsId)
          .eq("status", "scheduled")
          .lt("scheduled_at", nowIso).limit(2000),
        sb.from("leadchef_referrals")
          .select("id, name, status, authorization_status, created_by, created_at")
          .eq("workspace_id", wsId)
          .in("status", ["received", "to_contact"])
          .eq("authorization_status", "granted").limit(1000),
        sb.from("leadchef_client_profiles")
          .select("id, lead_id, status, post_sale_status, created_by, updated_at")
          .eq("workspace_id", wsId)
          .in("status", ["new_customer", "post_sale_pending"]).limit(1000),
        sb.from("leads").select("id, name, assigned_to, created_by").eq("workspace_id", wsId).limit(3000),
      ]);

      const profiles = (profilesRes.data ?? []) as any[];
      const appts = (apptsRes.data ?? []) as any[];
      const refs = (refsRes.data ?? []) as any[];
      const clients = (clientsRes.data ?? []) as any[];
      const leads = (leadsRes.data ?? []) as any[];
      const leadById = new Map(leads.map((l) => [l.id, l]));

      const alerts: LeadChefTeamAlert[] = [];

      for (const p of profiles) {
        if (["won", "lost"].includes(p.stage)) continue;
        const lead = p.lead ?? leadById.get(p.lead_id);
        const uid = lead?.assigned_to ?? lead?.created_by ?? null;
        if (!p.next_action_at) {
          alerts.push({
            id: `no-action-${p.lead_id}`,
            type: "no_next_action",
            severity: "warning",
            title: "Lead sem próxima ação",
            description: lead?.name ?? "Lead",
            userId: uid,
            userName: ownerName(uid),
            entityType: "lead",
            entityId: p.lead_id,
            createdAt: p.updated_at,
            actionHref: `/dashboard/leadchef/leads/${p.lead_id}`,
          });
        }
      }

      for (const a of appts) {
        const lead = a.lead_id ? leadById.get(a.lead_id) : null;
        const uid = a.created_by ?? lead?.assigned_to ?? null;
        alerts.push({
          id: `overdue-${a.id}`,
          type: "overdue_action",
          severity: "critical",
          title: a.type === "demo" && a.status === "scheduled" ? "Demonstração não concluída" : "Ação em atraso",
          description: a.title ?? lead?.name ?? "Compromisso",
          userId: uid,
          userName: ownerName(uid),
          entityType: "appointment",
          entityId: a.id,
          createdAt: a.scheduled_at,
          actionHref: a.lead_id ? `/dashboard/leadchef/leads/${a.lead_id}` : "/dashboard/leadchef/agenda",
        });
      }

      for (const r of refs) {
        alerts.push({
          id: `ref-${r.id}`,
          type: "referral_no_contact",
          severity: "info",
          title: "Referência por contactar",
          description: r.name,
          userId: r.created_by,
          userName: ownerName(r.created_by),
          entityType: "referral",
          entityId: r.id,
          createdAt: r.created_at,
          actionHref: `/dashboard/leadchef/referencias/${r.id}`,
        });
      }

      for (const c of clients) {
        const lead = leadById.get(c.lead_id);
        alerts.push({
          id: `client-${c.id}`,
          type: "client_no_post_sale",
          severity: "warning",
          title: "Cliente sem pós-venda",
          description: lead?.name ?? "Cliente",
          userId: c.created_by ?? lead?.assigned_to ?? null,
          userName: ownerName(c.created_by ?? lead?.assigned_to ?? null),
          entityType: "client",
          entityId: c.lead_id,
          createdAt: c.updated_at,
          actionHref: `/dashboard/leadchef/clientes/${c.lead_id}`,
        });
      }

      return alerts.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 };
        if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
    },
  });
}
