import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefClientStatus } from "@/components/leadchef/constants";

export interface LeadChefClient {
  /** id é o id do lead (cliente é sempre baseado num lead won) */
  id: string;
  leadId: string;
  profileId: string;
  clientProfileId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  wonAt: string | null;
  status: LeadChefClientStatus;
  postSaleStatus: string | null;
  nextFollowUpAt: string | null;
  potentialReferral: boolean;
  potentialRecruitment: boolean;
  notes: string | null;
}

interface Options {
  status?: LeadChefClientStatus | "all";
  search?: string;
}

export function useLeadChefClients(opts: Options = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { status = "all", search = "" } = opts;

  return useQuery({
    queryKey: ["leadchef-clients", workspaceId, status, search],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefClient[]> => {
      // 1. Perfis won
      const { data: profiles, error: profErr } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select("id,lead_id,stage,updated_at,lead:leads(id,name,phone,email)")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "won")
        .limit(1000);
      if (profErr) throw profErr;
      const wonProfiles = (profiles ?? []).filter((p: any) => p.lead);

      // 2. Client profiles existentes
      const leadIds = wonProfiles.map((p: any) => p.lead_id);
      let clientProfilesMap: Record<string, any> = {};
      if (leadIds.length) {
        const { data: cps } = await (supabase as any)
          .from("leadchef_client_profiles")
          .select("*")
          .eq("workspace_id", workspaceId!)
          .in("lead_id", leadIds);
        for (const cp of cps ?? []) {
          clientProfilesMap[cp.lead_id] = cp;
        }
      }

      const term = search.trim().toLowerCase();
      const rows: LeadChefClient[] = wonProfiles.map((p: any) => {
        const cp = clientProfilesMap[p.lead_id];
        const stat: LeadChefClientStatus = cp?.status ?? "new_customer";
        return {
          id: p.lead.id,
          leadId: p.lead_id,
          profileId: p.id,
          clientProfileId: cp?.id ?? null,
          name: p.lead.name,
          phone: p.lead.phone,
          email: p.lead.email,
          wonAt: p.updated_at,
          status: stat,
          postSaleStatus: cp?.post_sale_status ?? null,
          nextFollowUpAt: cp?.next_follow_up_at ?? null,
          potentialReferral: !!cp?.potential_referral,
          potentialRecruitment: !!cp?.potential_recruitment,
          notes: cp?.notes ?? null,
        };
      });

      let filtered = rows;
      if (status !== "all") filtered = filtered.filter((r) => r.status === status);
      if (term) {
        filtered = filtered.filter(
          (r) =>
            r.name?.toLowerCase().includes(term) ||
            r.phone?.toLowerCase().includes(term) ||
            r.email?.toLowerCase().includes(term)
        );
      }
      return filtered.sort((a, b) =>
        (b.wonAt ?? "").localeCompare(a.wonAt ?? "")
      );
    },
  });
}
