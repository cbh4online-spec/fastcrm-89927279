import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type DunningSequence = Database["public"]["Tables"]["dunning_sequences"]["Row"];
export type DunningStep = Database["public"]["Tables"]["dunning_steps"]["Row"];

export interface SequenceWithSteps extends DunningSequence {
  steps: DunningStep[];
}

export function useDunningSequences() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["dunning-sequences", wid],
    enabled: !!wid,
    queryFn: async (): Promise<SequenceWithSteps[]> => {
      const { data: seqs, error } = await supabase
        .from("dunning_sequences")
        .select("*")
        .eq("workspace_id", wid!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (seqs ?? []).map((s) => s.id);
      if (!ids.length) return [];

      const { data: steps, error: stepsErr } = await supabase
        .from("dunning_steps")
        .select("*")
        .in("sequence_id", ids)
        .order("step_order");
      if (stepsErr) throw stepsErr;

      return (seqs ?? []).map((s) => ({
        ...s,
        steps: (steps ?? []).filter((st) => st.sequence_id === s.id),
      }));
    },
  });
}

export function useCreateSequence() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; is_default?: boolean }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("dunning_sequences")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description ?? null,
          is_default: input.is_default ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sequência criada");
      qc.invalidateQueries({ queryKey: ["dunning-sequences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DunningSequence> }) => {
      const { error } = await supabase
        .from("dunning_sequences")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequência atualizada");
      qc.invalidateQueries({ queryKey: ["dunning-sequences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dunning_sequences")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequência removida");
      qc.invalidateQueries({ queryKey: ["dunning-sequences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertStep() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      sequence_id: string;
      step_order: number;
      days_after_due: number;
      channel: DunningStep["channel"];
      action_type: DunningStep["action_type"];
      template_subject?: string | null;
      template_body?: string | null;
      is_active?: boolean;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("dunning_steps").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dunning_steps").insert({
          workspace_id: currentWorkspace.id,
          ...input,
          is_active: input.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Passo guardado");
      qc.invalidateQueries({ queryKey: ["dunning-sequences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dunning_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dunning-sequences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAssignSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { caseId: string; sequenceId: string }) => {
      const { data, error } = await supabase.rpc("collections_assign_sequence", {
        p_case_id: input.caseId,
        p_sequence_id: input.sequenceId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sequência atribuída");
      qc.invalidateQueries({ queryKey: ["collection-case"] });
      qc.invalidateQueries({ queryKey: ["collection-cases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunAutoExecutor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("collections-auto-executor", {
        body: { triggered_at: new Date().toISOString() },
      });
      if (error) throw error;
      return data as { ok: boolean; cases_processed?: number; cases_advanced?: number; cases_escalated?: number };
    },
    onSuccess: (r) => {
      toast.success(`Motor executado: ${r.cases_advanced ?? 0} ações enviadas`);
      qc.invalidateQueries({ queryKey: ["collection-cases"] });
      qc.invalidateQueries({ queryKey: ["collection-case"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
