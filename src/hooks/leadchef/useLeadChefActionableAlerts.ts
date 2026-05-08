import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefAutomations } from "./useLeadChefAutomations";
import type {
  LeadChefActionableAlert,
  LeadChefAutomationRule,
} from "@/types/leadchefTemplates";
import type { LeadChefStage } from "@/types/leadchef";
import type { LeadChefAutomationDefault } from "@/utils/leadchef/templates";

const HOUR = 60 * 60 * 1000;

/**
 * Agregador de alertas acionáveis (Fase 9).
 * Considera apenas regras "is_enabled".
 */
export function useLeadChefActionableAlerts() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: automations } = useLeadChefAutomations();

  const isEnabled = (key: string): boolean => {
    const rules = (automations?.rules ?? []) as Array<
      LeadChefAutomationRule | (LeadChefAutomationDefault & { id?: string })
    >;
    const r = rules.find((x) => x.key === key);
    return r ? Boolean(r.is_enabled) : true;
  };

  return useQuery({
    queryKey: ["leadchef-actionable-alerts", workspaceId, automations?.rules?.map((r) => `${r.key}:${r.is_enabled}`).join(",")],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefActionableAlert[]> => {
      if (!workspaceId) return [];
      const alerts: LeadChefActionableAlert[] = [];
      const now = Date.now();

      // Leads
      const { data: leadsData } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select(
          "id,lead_id,stage,next_action_at,created_at,lead:leads(id,name,phone,last_contact_at)"
        )
        .eq("workspace_id", workspaceId);

      const leads: Array<{
        id: string;
        lead_id: string;
        stage: LeadChefStage;
        next_action_at: string | null;
        created_at: string;
        lead: { id: string; name: string; phone: string | null; last_contact_at: string | null } | null;
      }> = (leadsData ?? []).filter((r: any) => r.lead);

      for (const r of leads) {
        const leadName = r.lead?.name ?? "Lead";

        // A. Lead novo sem contacto há 24h
        if (
          isEnabled("lead_no_contact_24h") &&
          (r.stage === "new" || r.stage === "to_contact") &&
          !r.lead?.last_contact_at &&
          now - new Date(r.created_at).getTime() > 24 * HOUR
        ) {
          alerts.push({
            id: `no_contact:${r.id}`,
            type: "lead_no_contact_24h",
            severity: "warning",
            title: `${leadName} ainda não foi contactado`,
            description: "Lead novo há mais de 24h sem primeiro contacto.",
            entityType: "lead",
            entityId: r.lead_id,
            actionLabel: "Abrir lead",
            actionHref: `/dashboard/leadchef/leads/${r.lead_id}`,
            templateCategory: "first_contact",
            ruleKey: "lead_no_contact_24h",
          });
        }

        // B. Demo realizada sem follow-up
        if (
          isEnabled("demo_done_no_followup") &&
          r.stage === "demo_done" &&
          !r.next_action_at
        ) {
          alerts.push({
            id: `demo_no_followup:${r.id}`,
            type: "demo_done_no_followup",
            severity: "info",
            title: `${leadName} sem follow-up após demonstração`,
            description: "Sugestão: criar follow-up para amanhã.",
            entityType: "lead",
            entityId: r.lead_id,
            actionLabel: "Criar follow-up",
            actionHref: `/dashboard/leadchef/leads/${r.lead_id}`,
            templateCategory: "post_demo_follow_up",
            ruleKey: "demo_done_no_followup",
          });
        }

        // C. Proposta pendente >3d
        if (
          isEnabled("proposal_pending_3d") &&
          r.stage === "proposal_decision"
        ) {
          // updated_at proxy: usar created_at como aproximação se não tivermos outro
          const ref = r.next_action_at
            ? new Date(r.next_action_at).getTime()
            : new Date(r.created_at).getTime();
          if (now - ref > 3 * 24 * HOUR) {
            alerts.push({
              id: `proposal_pending:${r.id}`,
              type: "proposal_pending_3d",
              severity: "warning",
              title: `Proposta de ${leadName} sem decisão`,
              description: "Há mais de 3 dias sem resposta.",
              entityType: "lead",
              entityId: r.lead_id,
              actionLabel: "Enviar follow-up",
              actionHref: `/dashboard/leadchef/leads/${r.lead_id}`,
              templateCategory: "proposal_follow_up",
              ruleKey: "proposal_pending_3d",
            });
          }
        }

        // G. Reativação vencida
        if (
          isEnabled("reactivation_due") &&
          r.stage === "reactivate_later" &&
          r.next_action_at &&
          new Date(r.next_action_at).getTime() < now
        ) {
          alerts.push({
            id: `reactivation_due:${r.id}`,
            type: "reactivation_due",
            severity: "info",
            title: `Reativar ${leadName}`,
            description: "Data de reativação vencida.",
            entityType: "lead",
            entityId: r.lead_id,
            actionLabel: "Abrir lead",
            actionHref: `/dashboard/leadchef/leads/${r.lead_id}`,
            templateCategory: "reactivation",
            ruleKey: "reactivation_due",
          });
        }
      }

      // D. Won sem pós-venda — verificar appointments
      if (isEnabled("won_no_postsale")) {
        const wonLeads = leads.filter((r) => r.stage === "won");
        if (wonLeads.length > 0) {
          const ids = wonLeads.map((r) => r.lead_id);
          const { data: appts } = await (supabase as any)
            .from("leadchef_appointments")
            .select("lead_id,type,status")
            .eq("workspace_id", workspaceId)
            .in("lead_id", ids);
          const hasPostSale = new Set<string>();
          for (const a of (appts ?? []) as Array<{ lead_id: string; type: string }>) {
            if (a.type === "post_sale_visit") hasPostSale.add(a.lead_id);
          }
          for (const r of wonLeads) {
            if (!hasPostSale.has(r.lead_id)) {
              alerts.push({
                id: `won_no_postsale:${r.id}`,
                type: "won_no_postsale",
                severity: "info",
                title: `${r.lead?.name ?? "Cliente"} sem pós-venda`,
                description: "Sugestão: marcar visita de pós-venda.",
                entityType: "client",
                entityId: r.lead_id,
                actionLabel: "Marcar pós-venda",
                actionHref: `/dashboard/leadchef/clientes/${r.lead_id}`,
                templateCategory: "post_sale",
                ruleKey: "won_no_postsale",
              });
            }
          }
        }
      }

      // E. Referência autorizada sem contacto
      if (isEnabled("referral_authorized_no_contact")) {
        const { data: refs } = await (supabase as any)
          .from("leadchef_referrals")
          .select("id,name,authorization_status,status")
          .eq("workspace_id", workspaceId)
          .eq("authorization_status", "granted")
          .in("status", ["received", "to_contact"]);
        for (const r of (refs ?? []) as Array<{ id: string; name: string }>) {
          alerts.push({
            id: `referral_no_contact:${r.id}`,
            type: "referral_authorized_no_contact",
            severity: "warning",
            title: `${r.name} autorizou contacto`,
            description: "Ainda não foi contactada.",
            entityType: "referral",
            entityId: r.id,
            actionLabel: "Abrir referência",
            actionHref: `/dashboard/leadchef/referencias/${r.id}`,
            templateCategory: "referral_first_contact",
            ruleKey: "referral_authorized_no_contact",
          });
        }
      }

      return alerts;
    },
  });
}
