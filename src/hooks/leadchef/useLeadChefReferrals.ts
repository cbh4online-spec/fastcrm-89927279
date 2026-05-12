import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefReferral, LeadChefReferralStatus } from "@/types/leadchef";

interface Options {
  status?: LeadChefReferralStatus | "all";
  search?: string;
  referrerLeadId?: string;
}

export function useLeadChefReferrals(opts: Options = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { status = "all", search = "", referrerLeadId } = opts;

  return useQuery({
    queryKey: ["leadchef-referrals", workspaceId, status, search, referrerLeadId ?? null],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefReferral[]> => {
      let q = (supabase as any)
        .from("leadchef_referrals")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (status !== "all") q = q.eq("status", status);
      if (referrerLeadId) q = q.eq("referred_by_lead_id", referrerLeadId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as LeadChefReferral[];

      // Resolver nomes dos clientes que indicaram (best-effort)
      const referrerIds = Array.from(
        new Set(rows.map((r) => r.referred_by_lead_id).filter(Boolean) as string[])
      );
      const referrerNameMap: Record<string, string> = {};
      if (referrerIds.length) {
        const { data: leads } = await (supabase as any)
          .from("leads")
          .select("id,name")
          .in("id", referrerIds);
        for (const l of leads ?? []) referrerNameMap[l.id] = l.name;
      }
      rows = rows.map((r) => ({
        ...r,
        referred_by_lead_name: r.referred_by_lead_id ? referrerNameMap[r.referred_by_lead_id] ?? null : null,
      })) as any;

      const term = search.trim().toLowerCase();
      if (term) {
        rows = rows.filter(
          (r) =>
            r.name?.toLowerCase().includes(term) ||
            r.phone?.toLowerCase().includes(term) ||
            r.email?.toLowerCase().includes(term) ||
            (r as any).referred_by_lead_name?.toLowerCase().includes(term)
        );
      }
      return rows;
    },
  });
}
