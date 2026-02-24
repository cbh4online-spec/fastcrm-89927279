import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Opportunity } from "@/types/opportunity";
import type {
  DealIntelligencePayload,
  CompactDealIntelligence,
} from "@/types/dealIntelligence";

export function useDealIntelligenceAPI(dealId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery<DealIntelligencePayload | null>({
    queryKey: ["deal-intelligence", currentWorkspace?.id, dealId],
    queryFn: async () => {
      if (!dealId || !currentWorkspace) return null;
      const { data, error } = await supabase.functions.invoke("deal-intelligence", {
        body: { deal_id: dealId },
        headers: { "X-Workspace-Id": currentWorkspace.id },
      });
      if (error) throw error;
      return data as DealIntelligencePayload;
    },
    enabled: !!dealId && !!currentWorkspace,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBulkDealIntelligenceAPI(opportunities: Opportunity[] | undefined) {
  const { currentWorkspace } = useWorkspace();

  const oppIds = useMemo(
    () => (opportunities || []).map((o) => o.id),
    [opportunities]
  );

  const { data } = useQuery({
    queryKey: ["deal-intelligence-bulk", currentWorkspace?.id, oppIds],
    queryFn: async () => {
      if (!oppIds.length || !currentWorkspace) return new Map<string, CompactDealIntelligence>();
      const { data, error } = await supabase.functions.invoke("deal-intelligence", {
        body: { deal_ids: oppIds },
        headers: { "X-Workspace-Id": currentWorkspace.id },
      });
      if (error) throw error;
      const items = (data as any)?.items || {};
      const map = new Map<string, CompactDealIntelligence>();
      Object.entries(items).forEach(([id, val]) => {
        map.set(id, val as CompactDealIntelligence);
      });
      return map;
    },
    enabled: !!currentWorkspace && oppIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return { scoresMap: data || new Map<string, CompactDealIntelligence>() };
}
