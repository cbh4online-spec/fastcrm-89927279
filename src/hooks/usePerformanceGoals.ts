import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PerformanceGoal {
  id: string;
  workspace_id: string;
  goal_name: string;
  goal_type: string;
  kpi_id: string | null;
  target_value: number;
  period_type: string;
  period_start: string;
  period_end: string;
  scope_type: string;
  scope_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePerformanceGoals() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["performance-goals", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_goals")
        .select("*")
        .eq("workspace_id", wid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PerformanceGoal[];
    },
  });
}

export function useCreateGoal() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Partial<PerformanceGoal>) => {
      const { data, error } = await supabase
        .from("performance_goals")
        .insert([{ ...goal, workspace_id: currentWorkspace!.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-goals"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("performance_goals").delete().eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-goals"] });
    },
  });
}
