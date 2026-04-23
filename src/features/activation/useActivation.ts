import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ActivationGoal, ActivationProgress, OnboardingState } from "./types";

export function useActivationGoals() {
  return useQuery({
    queryKey: ["activation-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activation_goals" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data as unknown as ActivationGoal[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivationProgress() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["activation-progress", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("workspace_activation_progress" as any)
        .select("*")
        .eq("workspace_id", wsId);
      if (error) throw error;
      return (data as unknown as ActivationProgress[]) || [];
    },
    enabled: !!wsId,
  });
}

export function useOnboardingState() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wsId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["onboarding-state", wsId],
    queryFn: async () => {
      if (!wsId) return null;
      const { data, error } = await supabase
        .from("workspace_onboarding_state" as any)
        .select("*")
        .eq("workspace_id", wsId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created } = await supabase
          .from("workspace_onboarding_state" as any)
          .insert({ workspace_id: wsId } as any)
          .select()
          .maybeSingle();
        return (created as unknown as OnboardingState) || null;
      }
      return data as unknown as OnboardingState;
    },
    enabled: !!wsId,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<OnboardingState>) => {
      if (!wsId) throw new Error("No workspace");
      const { error } = await supabase
        .from("workspace_onboarding_state" as any)
        .upsert({ workspace_id: wsId, ...patch, updated_at: new Date().toISOString() } as any, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-state", wsId] }),
  });

  return { state: query.data, isLoading: query.isLoading, update };
}

export function useMarkGoal() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ goalKey, source = "manual" }: { goalKey: string; source?: "manual" | "auto" | "admin" }) => {
      if (!wsId) throw new Error("No workspace");
      const { error } = await supabase.rpc("mark_activation_goal" as any, {
        _workspace_id: wsId,
        _goal_key: goalKey,
        _source: source,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activation-progress", wsId] });
      queryClient.invalidateQueries({ queryKey: ["activation-score", wsId] });
    },
  });
}

export function useActivationScore() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["activation-score", wsId],
    queryFn: async () => {
      if (!wsId) return null;
      const { data, error } = await supabase.rpc("compute_workspace_activation_score" as any, {
        _workspace_id: wsId,
      } as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { score: number; goals_completed: number; goals_total: number; category_breakdown: Record<string, { completed: number; total: number }> } | null;
    },
    enabled: !!wsId,
  });
}
