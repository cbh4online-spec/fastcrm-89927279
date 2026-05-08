import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buildCSV, downloadFile } from "@/utils/leadchef/csv";
import { useCreateLeadChefAuditLog } from "./useCreateLeadChefAuditLog";
import { useLeadChefPermissions } from "./useLeadChefPermissions";

export type ExportEntity =
  | "leads"
  | "clients"
  | "referrals"
  | "agenda"
  | "goals"
  | "experiences";

export interface ExportFilters {
  from?: string;
  to?: string;
  stage?: string;
  status?: string;
  origin?: string;
  agentId?: string;
}

function fmt(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("pt-PT");
  } catch {
    return String(d ?? "");
  }
}

export function useLeadChefExport() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const perms = useLeadChefPermissions();
  const auditMut = useCreateLeadChefAuditLog();

  return useMutation({
    mutationFn: async ({
      entity,
      filters = {},
    }: {
      entity: ExportEntity;
      filters?: ExportFilters;
    }) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      if (!user?.id) throw new Error("Sessão não encontrada.");

      const restrictToSelf = !perms.canViewAllLeadChefData;

      let headers: string[] = [];
      let rows: Record<string, unknown>[] = [];
      let filename = `leadchef-${entity}-${new Date().toISOString().slice(0, 10)}.csv`;

      switch (entity) {
        case "leads": {
          let q = (supabase as any)
            .from("leadchef_lead_profiles")
            .select("*, leads:lead_id(name, phone, email, source, created_at, created_by)")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .limit(5000);
          if (filters.stage) q = q.eq("stage", filters.stage);
          if (filters.from) q = q.gte("created_at", filters.from);
          if (filters.to) q = q.lte("created_at", filters.to);
          if (restrictToSelf) q = q.eq("created_by", user.id);
          else if (filters.agentId) q = q.eq("created_by", filters.agentId);

          const { data, error } = await q;
          if (error) throw error;
          headers = [
            "Nome",
            "Telefone",
            "Email",
            "Origem",
            "Interesse",
            "Etapa",
            "Temperatura",
            "Próxima ação",
            "Data próxima ação",
            "Criado em",
          ];
          rows = (data ?? []).map((p: any) => ({
            Nome: p.leads?.name ?? "",
            Telefone: p.leads?.phone ?? "",
            Email: p.leads?.email ?? "",
            Origem: p.origin ?? p.leads?.source ?? "",
            Interesse: p.interest ?? "",
            Etapa: p.stage ?? "",
            Temperatura: p.temperature ?? "",
            "Próxima ação": p.next_action_type ?? "",
            "Data próxima ação": fmt(p.next_action_at),
            "Criado em": fmt(p.leads?.created_at ?? p.created_at),
          }));
          break;
        }
        case "clients": {
          let q = (supabase as any)
            .from("leadchef_lead_profiles")
            .select("*, leads:lead_id(name, phone, email, created_at)")
            .eq("workspace_id", workspaceId)
            .eq("stage", "won")
            .order("updated_at", { ascending: false })
            .limit(5000);
          if (restrictToSelf) q = q.eq("created_by", user.id);
          else if (filters.agentId) q = q.eq("created_by", filters.agentId);
          const { data, error } = await q;
          if (error) throw error;
          headers = [
            "Nome",
            "Telefone",
            "Email",
            "Estado",
            "Potencial referência",
            "Potencial recrutamento",
            "Criado em",
          ];
          rows = (data ?? []).map((p: any) => ({
            Nome: p.leads?.name ?? "",
            Telefone: p.leads?.phone ?? "",
            Email: p.leads?.email ?? "",
            Estado: p.client_status ?? "active",
            "Potencial referência": p.referral_potential ? "Sim" : "Não",
            "Potencial recrutamento": p.recruitment_potential ? "Sim" : "Não",
            "Criado em": fmt(p.leads?.created_at ?? p.created_at),
          }));
          break;
        }
        case "referrals": {
          let q = (supabase as any)
            .from("leadchef_referrals")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .limit(5000);
          if (filters.status) q = q.eq("status", filters.status);
          if (restrictToSelf) q = q.eq("created_by", user.id);
          const { data, error } = await q;
          if (error) throw error;
          headers = [
            "Nome",
            "Telefone",
            "Email",
            "Estado",
            "Autorização",
            "Indicado por",
            "Convertida",
            "Criado em",
          ];
          rows = (data ?? []).map((r: any) => ({
            Nome: r.name ?? "",
            Telefone: r.phone ?? "",
            Email: r.email ?? "",
            Estado: r.status ?? "",
            Autorização: r.authorization_status ?? "",
            "Indicado por": r.referred_by_name ?? "",
            Convertida: r.converted_lead_id ? "Sim" : "Não",
            "Criado em": fmt(r.created_at),
          }));
          break;
        }
        case "agenda": {
          let q = (supabase as any)
            .from("crm_appointments")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("scheduled_at", { ascending: true })
            .limit(5000);
          if (filters.from) q = q.gte("scheduled_at", filters.from);
          if (filters.to) q = q.lte("scheduled_at", filters.to);
          if (restrictToSelf) q = q.eq("created_by", user.id);
          const { data, error } = await q;
          if (error) throw error;
          headers = ["Data", "Hora", "Tipo", "Título", "Estado", "Notas"];
          rows = (data ?? []).map((a: any) => {
            const d = a.scheduled_at ? new Date(a.scheduled_at) : null;
            return {
              Data: d ? d.toLocaleDateString("pt-PT") : "",
              Hora: d ? d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "",
              Tipo: a.appointment_type ?? "",
              Título: a.title ?? "",
              Estado: a.status ?? "",
              Notas: a.notes ?? "",
            };
          });
          break;
        }
        case "goals": {
          let q = (supabase as any)
            .from("leadchef_goals")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("period_month", { ascending: false })
            .limit(2000);
          if (restrictToSelf) q = q.eq("user_id", user.id);
          else if (filters.agentId) q = q.eq("user_id", filters.agentId);
          const { data, error } = await q;
          if (error) throw error;
          headers = [
            "Mês",
            "Leads objetivo",
            "Contactos objetivo",
            "Demonstrações objetivo",
            "Vendas objetivo",
            "Referências objetivo",
            "Recrutamento objetivo",
            "Rendimento objetivo",
          ];
          rows = (data ?? []).map((g: any) => ({
            Mês: g.period_month ?? "",
            "Leads objetivo": g.leads_target ?? 0,
            "Contactos objetivo": g.contacts_target ?? 0,
            "Demonstrações objetivo": g.demos_target ?? 0,
            "Vendas objetivo": g.sales_target ?? 0,
            "Referências objetivo": g.referrals_target ?? 0,
            "Recrutamento objetivo": g.recruitment_target ?? 0,
            "Rendimento objetivo": g.income_target ?? 0,
          }));
          break;
        }
        case "experiences": {
          if (restrictToSelf) {
            // mantemos restrição mínima de privacidade
          }
          let q = (supabase as any)
            .from("leadchef_customer_experiences")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("updated_at", { ascending: false })
            .limit(2000);
          if (restrictToSelf) q = q.eq("created_by", user.id);
          const { data, error } = await q;
          if (error) throw error;
          headers = ["Lead ID", "Atualizado em", "Resumo"];
          rows = (data ?? []).map((e: any) => ({
            "Lead ID": e.lead_id ?? "",
            "Atualizado em": fmt(e.updated_at),
            Resumo: JSON.stringify(e.data ?? {}).slice(0, 500),
          }));
          break;
        }
      }

      const csv = buildCSV(headers, rows);
      downloadFile(filename, csv);

      auditMut.mutate({
        action: "export_created",
        entityType: `leadchef_${entity}`,
        description: `Exportação ${entity}: ${rows.length} registos`,
        metadata: { entity, count: rows.length, filters },
      });

      return { count: rows.length, filename };
    },
    onSuccess: (res) => {
      toast.success(`Exportação concluída (${res.count} registos).`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível exportar.");
    },
  });
}
