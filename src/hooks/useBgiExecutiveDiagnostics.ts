import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { CustomerBehavior, ExecutiveDiagnostics } from "@/lib/bgi/executiveDiagnostics";
import type { ActionLists } from "@/lib/bgi/actionLists";

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

export function useBgiCustomerBehavior(start: string, end: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["bgi-customer-behavior", wsId, start, end],
    enabled: !!wsId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CustomerBehavior> => {
      const { data, error } = await supabase.rpc("bgi_customer_behavior", { _workspace_id: wsId!, _start: start, _end: end });
      if (error) throw error;
      return data as unknown as CustomerBehavior;
    },
  });
}

export function useBgiActionLists(start: string, end: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["bgi-action-lists", wsId, start, end],
    enabled: !!wsId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ActionLists> => {
      const { data, error } = await supabase.rpc("bgi_action_lists", { _workspace_id: wsId!, _start: start, _end: end });
      if (error) throw error;
      return data as unknown as ActionLists;
    },
  });
}
