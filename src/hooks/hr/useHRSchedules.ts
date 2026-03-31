import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { toast } from "sonner";

export type HRShift = {
  id: string;
  workspace_id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  description: string | null;
};

export type HRSchedule = {
  id: string;
  workspace_id: string;
  employee_id: string;
  shift_id: string | null;
  schedule_date: string;
  custom_start_time: string | null;
  custom_end_time: string | null;
  notes: string | null;
  hr_employees?: { id: string; full_name: string; avatar_url: string | null };
  hr_shifts?: { id: string; name: string; start_time: string; end_time: string; color: string };
};

export function useHRShifts() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-shifts", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_shifts" as any).select("*").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data as unknown as HRShift[];
    },
    enabled: !!wsId,
  });
}

export function useCreateHRShift() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<HRShift>) => {
      const { data, error } = await supabase.from("hr_shifts" as any).insert({ ...values, workspace_id: wsId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Turno criado");
      queryClient.invalidateQueries({ queryKey: ["hr-shifts"] });
    },
    onError: () => toast.error("Erro ao criar turno"),
  });
}

export function useDeleteHRShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_shifts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Turno eliminado");
      queryClient.invalidateQueries({ queryKey: ["hr-shifts"] });
    },
    onError: () => toast.error("Erro ao eliminar turno"),
  });
}

export function useHRSchedules(weekDate: Date) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const start = format(startOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = format(endOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["hr-schedules", wsId, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_schedules" as any)
        .select("*, hr_employees(id, full_name, avatar_url), hr_shifts(id, name, start_time, end_time, color)")
        .eq("workspace_id", wsId!)
        .gte("schedule_date", start)
        .lte("schedule_date", end);
      if (error) throw error;
      return data as unknown as HRSchedule[];
    },
    enabled: !!wsId,
  });
}

export function useUpsertSchedule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: { employee_id: string; shift_id?: string; schedule_date: string; notes?: string }) => {
      const { data, error } = await supabase.from("hr_schedules" as any).upsert(
        { ...values, workspace_id: wsId, updated_at: new Date().toISOString() },
        { onConflict: "employee_id,schedule_date" }
      ).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Turno atribuído");
      queryClient.invalidateQueries({ queryKey: ["hr-schedules"] });
    },
    onError: () => toast.error("Erro ao atribuir turno"),
  });
}
