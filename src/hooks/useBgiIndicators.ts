import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type BgiPeriod = "month" | "quarter" | "year";
type Values = Record<string, number | null>;
export interface BgiIndicatorResult { current: Values; previous: Values; yoy: Values; start: string; end: string }

/** Uma única chamada ao servidor por ecrã (sem chamadas por indicador). */
export function useBgiIndicators(period: BgiPeriod, anchor: string | null, enabled: boolean) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["bgi-indicators", wsId, period, anchor],
    enabled: enabled && !!wsId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BgiIndicatorResult> => {
      const { data, error } = await supabase.rpc("bgi_compute_indicators", {
        _workspace_id: wsId!, _period: period, ...(anchor ? { _anchor: anchor } : {}),
      });
      if (error) throw error;
      return data as unknown as BgiIndicatorResult;
    },
  });
}
