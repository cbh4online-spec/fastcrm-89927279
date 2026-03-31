import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HRWorkSession = {
  id: string;
  workspace_id: string;
  employee_id: string;
  session_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_minutes: number;
  total_minutes: number | null;
  worked_minutes: number | null;
  status: "complete" | "incomplete" | "manual";
  notes: string | null;
  hr_employees?: { full_name: string; avatar_url: string | null; department: string | null };
};

export function useHRWorkSessions(employeeId?: string, startDate?: string, endDate?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-work-sessions", wsId, employeeId, startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("hr_work_sessions" as any)
        .select("*, hr_employees(full_name, avatar_url, department)")
        .eq("workspace_id", wsId!)
        .order("session_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (startDate) q = q.gte("session_date", startDate);
      if (endDate) q = q.lte("session_date", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HRWorkSession[];
    },
    enabled: !!wsId,
  });
}

export function useClockAction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      entry_type: "clock_in" | "clock_out" | "break_start" | "break_end";
      method?: "qr" | "manual" | "app";
      notes?: string;
    }) => {
      const res = await supabase.functions.invoke("hr-clock-action", {
        body: { ...payload, workspace_id: wsId }
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success("Registo efetuado");
      queryClient.invalidateQueries({ queryKey: ["hr-work-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["hr-time-entries"] });
    },
    onError: () => toast.error("Erro ao registar"),
  });
}

export function useHRTimeEntries(employeeId?: string, date?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-time-entries", wsId, employeeId, date],
    queryFn: async () => {
      let q = supabase
        .from("hr_time_entries" as any)
        .select("*, hr_employees(full_name)")
        .eq("workspace_id", wsId!)
        .order("recorded_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (date) {
        q = q.gte("recorded_at", `${date}T00:00:00`).lte("recorded_at", `${date}T23:59:59`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!wsId,
  });
}
