import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCreateTask } from "@/hooks/useTasks";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface StrategicDecision {
  id: string;
  workspace_id: string;
  created_at: string;
  decision_title: string;
  business_area: "sales" | "marketing" | "pricing" | "operations" | "retention";
  impact_level: "high" | "medium" | "low";
  urgency: "immediate" | "this_week" | "monitor";
  explanation: string;
  recommended_steps: string[];
  status: "open" | "dismissed" | "converted";
  rule_key: string | null;
}

export function useStrategicDecisions() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["strategic-decisions", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("strategic_decisions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((d) => ({
        ...d,
        recommended_steps: Array.isArray(d.recommended_steps)
          ? d.recommended_steps
          : [],
      })) as StrategicDecision[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useGenerateStrategicDecisions() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await supabase.functions.invoke(
        "compute-strategic-decisions",
        { body: { workspace_id: currentWorkspace.id } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions", currentWorkspace?.id],
      });
      console.log('[STRATEGY] DECISIONS_GENERATED', { workspace: currentWorkspace?.id });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DECISION.CREATED',
          entity_kind: 'strategic_decision',
          entity_id: currentWorkspace.id,
          source_module: 'strategy-command-center',
          payload: { source: 'strategic_engine' },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] GENERATE_FAILED', { error: (error as Error).message });
    },
  });
}

export function useDecisionHistory() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["strategic-decisions-history", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("strategic_decisions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["dismissed", "converted"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((d) => ({
        ...d,
        recommended_steps: Array.isArray(d.recommended_steps) ? d.recommended_steps : [],
      })) as StrategicDecision[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useDismissDecision() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("strategic_decisions")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions", currentWorkspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions-history", currentWorkspace?.id],
      });
      console.log('[STRATEGY] DECISION_DISMISSED', { id });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DECISION.DISMISSED',
          entity_kind: 'strategic_decision',
          entity_id: id,
          source_module: 'strategy-command-center',
          payload: { decision_id: id },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] DISMISS_FAILED', { error: (error as Error).message });
    },
  });
}

export function useConvertDecisionStep() {
  const createTask = useCreateTask();

  return useMutation({
    mutationFn: async ({ step }: { step: string; decisionId: string }) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await createTask.mutateAsync({
        title: step,
        due_at: dueDate.toISOString(),
      });
    },
  });
}

export function useBulkConvertAllDecisions() {
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (decisions: StrategicDecision[]) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      let totalTasks = 0;

      for (const decision of decisions) {
        for (const step of decision.recommended_steps) {
          await createTask.mutateAsync({ title: step, due_at: dueDate.toISOString() });
          totalTasks++;
        }
        const { error } = await supabase
          .from("strategic_decisions")
          .update({ status: "converted" })
          .eq("id", decision.id);
        if (error) throw error;
      }

      return { totalTasks, totalDecisions: decisions.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions", currentWorkspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions-history", currentWorkspace?.id],
      });
      console.log('[STRATEGY] BULK_CONVERTED', { total_decisions: result.totalDecisions, total_tasks: result.totalTasks });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DECISION.BULK_CONVERTED',
          entity_kind: 'strategic_decision',
          entity_id: currentWorkspace.id,
          source_module: 'strategy-command-center',
          payload: { total_decisions: result.totalDecisions, total_tasks: result.totalTasks },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] BULK_CONVERT_FAILED', { error: (error as Error).message });
    },
  });
}

export function useConvertAllDecisionSteps() {
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      steps,
      decisionId,
    }: {
      steps: string[];
      decisionId: string;
    }) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      for (const step of steps) {
        await createTask.mutateAsync({ title: step, due_at: dueDate.toISOString() });
      }

      const { error } = await supabase
        .from("strategic_decisions")
        .update({ status: "converted" })
        .eq("id", decisionId);
      if (error) throw error;
      return { decisionId, stepsCount: steps.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions", currentWorkspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions-history", currentWorkspace?.id],
      });
      console.log('[STRATEGY] DECISION_CONVERTED', { id: result.decisionId, steps: result.stepsCount });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DECISION.CONVERTED',
          entity_kind: 'strategic_decision',
          entity_id: result.decisionId,
          source_module: 'strategy-command-center',
          payload: { decision_id: result.decisionId, steps_count: result.stepsCount },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] CONVERT_FAILED', { error: (error as Error).message });
    },
  });
}
