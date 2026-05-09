import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type {
  LeadChefLeadWithProfile,
  LeadChefStage,
  LeadChefLeadProfile,
  LeadChefLeadBase,
} from "@/types/leadchef";

interface Options {
  search?: string;
  stage?: LeadChefStage | "all";
}

interface RawRow extends LeadChefLeadProfile {
  lead: LeadChefLeadBase | null;
}

export function useLeadChefLeads(opts: Options = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const search = opts.search?.trim() ?? "";
  const stage = opts.stage ?? "all";

  return useQuery({
    queryKey: ["leadchef-leads", workspaceId, stage, search],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefLeadWithProfile[]> => {
      if (!workspaceId) return [];

      let q = (supabase as any)
        .from("leadchef_lead_profiles")
        .select(
          "*, lead:leads!inner(id,name,email,phone,source,status,last_contact_at,ai_temperature)"
        )
        .eq("workspace_id", workspaceId)
        .order("next_action_at", { ascending: true, nullsFirst: false })
        .limit(500);

      if (stage !== "all") q = q.eq("stage", stage);

      // Server-side search: usa filtro no profile (origin/interest) e no lead embebido (name/email/phone)
      if (search) {
        const safe = search.replace(/[%,()]/g, " ").trim();
        if (safe) {
          q = q.or(
            `origin.ilike.%${safe}%,interest.ilike.%${safe}%,lead.name.ilike.%${safe}%,lead.email.ilike.%${safe}%,lead.phone.ilike.%${safe}%`
          );
        }
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as RawRow[];

      return rows
        .filter((r) => r.lead)
        .map((r) => ({
          profile: {
            id: r.id,
            workspace_id: r.workspace_id,
            lead_id: r.lead_id,
            stage: r.stage,
            interest: r.interest,
            origin: r.origin,
            temperature: r.temperature,
            next_action_type: r.next_action_type,
            next_action_at: r.next_action_at,
            next_action_note: r.next_action_note,
            cycle: r.cycle ?? {},
            customer_experience: r.customer_experience ?? {},
            recruitment_potential: r.recruitment_potential,
            created_by: r.created_by,
            created_at: r.created_at,
            updated_at: r.updated_at,
          },
          lead: r.lead!,
        }));
    },
  });
}
