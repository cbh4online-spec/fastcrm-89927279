import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type HRLeaveBalance = {
  id: string;
  workspace_id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  carried_over_days: number;
  available_days: number;
  hr_absence_types?: { name: string; color: string; code: string | null };
};

export function useHRLeaveBalances(employeeId?: string, year?: number) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const currentYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ["hr-leave-balances", wsId, employeeId, currentYear],
    queryFn: async () => {
      let q = supabase
        .from("hr_leave_balances" as any)
        .select("*, hr_absence_types(name, color, code)")
        .eq("workspace_id", wsId!)
        .eq("year", currentYear);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HRLeaveBalance[];
    },
    enabled: !!wsId,
  });
}
