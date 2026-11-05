import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ExecutiveDiagnostics } from "@/lib/bgi/executiveDiagnostics";

export function useBgiExecutiveDiagnostics(start: string, end: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["bgi-executive-diagnostics", wsId, start, end],
    enabled: !!wsId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ExecutiveDiagnostics> => {
      const { data, error } = await supabase.rpc("bgi_executive_diagnostics", { _workspace_id: wsId!, _start: start, _end: end });
      if (error) throw error;
      return data as unknown as ExecutiveDiagnostics;
    },
  });
}
