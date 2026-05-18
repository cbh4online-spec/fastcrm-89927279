import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CollectionActionRow } from "../types/collections";

export function useCaseActions(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-actions", caseId],
    enabled: !!caseId,
    queryFn: async (): Promise<CollectionActionRow[]> => {
      if (!caseId) return [];
      const { data, error } = await supabase
        .from("collection_actions")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CollectionActionRow[];
    },
    refetchOnWindowFocus: true,
  });
}
