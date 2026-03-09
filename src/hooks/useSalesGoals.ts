import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { startOfMonth, format } from "date-fns";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface SalesGoal {
  id: string;
  workspace_id: string;
  month: string;
  leads_target: number;
  proposals_target: number;
  opportunities_target: number;
  revenue_target: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSalesGoalInput {
  month: Date;
  leads_target: number;
  proposals_target: number;
  opportunities_target: number;
  revenue_target: number;
}

export interface UpdateSalesGoalInput {
  id: string;
  leads_target?: number;
  proposals_target?: number;
  opportunities_target?: number;
  revenue_target?: number;
}

export function useSalesGoals() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sales-goals", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sales_goals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("month", { ascending: false });

      if (error) throw error;
      return data as SalesGoal[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCurrentMonthGoal() {
  const { currentWorkspace } = useWorkspace();
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["sales-goals", currentWorkspace?.id, "current"],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("sales_goals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) throw error;
      return data as SalesGoal | null;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateSalesGoal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateSalesGoalInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data, error } = await supabase
        .from("sales_goals")
        .insert({
          workspace_id: currentWorkspace.id,
          month: format(startOfMonth(input.month), "yyyy-MM-dd"),
          leads_target: input.leads_target,
          proposals_target: input.proposals_target,
          opportunities_target: input.opportunities_target,
          revenue_target: input.revenue_target,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] });
    },
  });
}

export function useUpdateSalesGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSalesGoalInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("sales_goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] });
    },
  });
}

export function useUpsertSalesGoal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateSalesGoalInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const monthStr = format(startOfMonth(input.month), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("sales_goals")
        .upsert(
          {
            workspace_id: currentWorkspace.id,
            month: monthStr,
            leads_target: input.leads_target,
            proposals_target: input.proposals_target,
            opportunities_target: input.opportunities_target,
            revenue_target: input.revenue_target,
            created_by: userData.user.id,
          },
          {
            onConflict: "workspace_id,month",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] });
    },
  });
}
