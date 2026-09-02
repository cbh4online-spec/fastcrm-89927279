/**
 * Next Best Message de uma lead.
 *
 * Junta a recomendação persistida (`next_best_actions`), o template do
 * playbook e o resolvedor de variáveis para produzir a mensagem sugerida
 * pronta a enviar (ou bloqueada quando faltam dados obrigatórios).
 */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { renderEngineMessage, type RenderResult } from "@/lib/whatsapp/engine/render";
import { resolveEngineVariables } from "@/lib/whatsapp/engine/resolveVariables";
import type { PlaybookTemplate } from "@/hooks/useWhatsAppPlaybook";

const sb = supabase as any;

export interface LeadNBARow {
  id: string;
  action_type: string;
  title: string;
  rationale: string | null;
  priority_score: number;
  urgency: string;
  confidence: string;
  due_at: string | null;
  status: string;
  suggested_payload_json: { template_code?: string | null; phone?: string | null } | null;
  created_at: string;
}

export interface LeadNBAContext {
  action: LeadNBARow | null;
  template: PlaybookTemplate | null;
  alternatives: PlaybookTemplate[];
  lead: { id: string; name: string | null; phone: string | null; source: string | null } | null;
  render: RenderResult | null;
}

export function useLeadNextBestAction(leadId: string | null | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const wid = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["lead-next-best-action", wid, leadId],
    queryFn: async () => {
      if (!wid || !leadId) return null;

      const [{ data: action }, { data: lead }, { data: profile }, { data: meeting }] = await Promise.all([
        sb
          .from("next_best_actions")
          .select("*")
          .eq("workspace_id", wid)
          .eq("entity_type", "lead")
          .eq("entity_id", leadId)
          .eq("status", "pending")
          .order("priority_score", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("leads")
          .select("id, name, phone, source, company_name, industry")
          .eq("id", leadId)
          .maybeSingle(),
        sb.from("lead_commercial_profile").select("*").eq("lead_id", leadId).maybeSingle(),
        sb
          .from("meetings")
          .select("start_time, meeting_url")
          .eq("workspace_id", wid)
          .eq("lead_id", leadId)
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const code = (action as LeadNBARow | null)?.suggested_payload_json?.template_code ?? null;

      const [{ data: template }, { data: playbook }] = await Promise.all([
        code
          ? sb
              .from("whatsapp_template_playbook")
              .select("*")
              .eq("workspace_id", wid)
              .eq("code", code)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        sb
          .from("whatsapp_template_playbook")
          .select("*")
          .eq("workspace_id", wid)
          .eq("is_active", true)
          .order("priority", { ascending: false }),
      ]);

      const tpl = (template ?? null) as PlaybookTemplate | null;
      const all = (playbook ?? []) as PlaybookTemplate[];

      return {
        action: (action ?? null) as LeadNBARow | null,
        template: tpl,
        alternatives: all.filter((t) => (tpl ? t.family === tpl.family && t.code !== tpl.code : true)),
        lead: (lead ?? null) as LeadNBAContext["lead"],
        profile: profile ?? null,
        meeting: meeting ?? null,
      };
    },
    enabled: !!wid && !!leadId,
  });

  const rendered = useMemo<RenderResult | null>(() => {
    const d = query.data;
    if (!d?.template) return null;
    const values = resolveEngineVariables({
      lead: d.lead as any,
      profile: d.profile as any,
      meeting: d.meeting as any,
      commercialName:
        (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? null,
      workspaceName: currentWorkspace?.name ?? null,
      defaultMeetingMinutes: 15,
    });
    return renderEngineMessage({
      body: d.template.message_body,
      values,
      fallbacks: d.template.variable_fallbacks ?? {},
      requiredVariables: d.template.required_variables ?? [],
    });
  }, [query.data, user, currentWorkspace?.name]);

  return { ...query, rendered };
}

/** Marca a recomendação como executada ou ignorada. */
export function useResolveLeadNBA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { actionId: string; outcome: "acted" | "dismissed" }) => {
      const now = new Date().toISOString();
      const patch =
        vars.outcome === "acted"
          ? { status: "acted", acted_at: now, updated_at: now }
          : { status: "dismissed", dismissed_at: now, updated_at: now };
      const { error } = await sb.from("next_best_actions").update(patch).eq("id", vars.actionId);
      if (error) throw error;
      return vars;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["lead-next-best-action"] });
      qc.invalidateQueries({ queryKey: ["next-best-actions"] });
      if (vars.outcome === "dismissed") toast.success("Recomendação ignorada.");
    },
    onError: (e: Error) => toast.error("Não foi possível atualizar a recomendação: " + e.message),
  });
}
