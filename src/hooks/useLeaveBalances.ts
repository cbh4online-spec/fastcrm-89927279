import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface LeaveBalance {
  id: string;
  workspace_id: string;
  user_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
}

export function useLeaveBalances(year?: number) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const currentYear = year ?? new Date().getFullYear();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["leave-balances", wsId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("workspace_id", wsId!)
        .eq("year", currentYear);
      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: !!wsId,
  });

  return { balances, isLoading };
}
