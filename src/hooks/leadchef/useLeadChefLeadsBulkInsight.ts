import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface LeadChefLeadInsight {
  score: number | null;
  isCold: boolean;
  suggestionAction: string | null;
  suggestionUrgency: "low" | "medium" | "high" | null;
}

const EMPTY: Record<string, LeadChefLeadInsight> = {};

/**
 * Bulk-loads scores + cached AI suggestions for a list of leads.
 * Single round-trip (no N+1) and never triggers AI generation (read-only on cache).
 */
export function useLeadChefLeadsBulkInsight(leadIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const ids = Array.from(new Set(leadIds.filter(Boolean))).sort();
  const key = ids.join(",");

  return useQuery({
    queryKey: ["leadchef", "leads-bulk-insight", workspaceId, key],
    enabled: !!workspaceId && ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, LeadChefLeadInsight>> => {
      const sb = supabase as any;
      const map: Record<string, LeadChefLeadInsight> = {};
      for (const id of ids) {
        map[id] = { score: null, isCold: false, suggestionAction: null, suggestionUrgency: null };
      }

      const [{ data: scores }, { data: suggestions }] = await Promise.all([
        sb
          .from("leadchef_lead_scores")
          .select("lead_id, score, is_cold")
          .eq("workspace_id", workspaceId)
          .in("lead_id", ids),
        sb
          .from("leadchef_ai_suggestions")
          .select("lead_id, payload, created_at, expires_at")
          .eq("workspace_id", workspaceId)
          .in("lead_id", ids)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ]);

      for (const row of scores ?? []) {
        const e = map[row.lead_id];
        if (!e) continue;
        e.score = typeof row.score === "number" ? row.score : null;
        e.isCold = !!row.is_cold;
      }

      // Latest suggestion per lead (rows are pre-sorted desc).
      for (const row of suggestions ?? []) {
        const e = map[row.lead_id];
        if (!e || e.suggestionAction) continue;
        const p = row.payload ?? {};
        if (typeof p.action === "string" && p.action.trim()) {
          e.suggestionAction = p.action.trim();
          e.suggestionUrgency = (p.urgency as any) ?? null;
        }
      }
      return map;
    },
  });
}

export function pickInsight(
  map: Record<string, LeadChefLeadInsight> | undefined,
  leadId: string
): LeadChefLeadInsight {
  return map?.[leadId] ?? { score: null, isCold: false, suggestionAction: null, suggestionUrgency: null };
}

export const EMPTY_INSIGHT_MAP = EMPTY;
