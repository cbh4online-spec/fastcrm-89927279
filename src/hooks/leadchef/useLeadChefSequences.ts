import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LeadChefSequence {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  trigger_event: string;
  created_at: string;
}

export interface LeadChefSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_days: number;
  action_type: "next_action" | "alert" | "draft_message";
  title: string;
  message_template: string | null;
  config: Record<string, unknown>;
}

export function useLeadChefSequences() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-sequences", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_sequences")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadChefSequence[];
    },
  });
}

export function useLeadChefSequenceSteps(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ["leadchef-sequence-steps", sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeadChefSequenceStep[];
    },
  });
}

export function useToggleLeadChefSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from("leadchef_sequences")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-sequences"] });
      toast.success("Sequência atualizada.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar."),
  });
}

export function useEnrollLeadInSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) => {
      const { data, error } = await (supabase as any).rpc("enroll_lead_in_leadchef_sequence", {
        p_lead_id: leadId,
        p_sequence_id: sequenceId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-lead-runs"] });
      toast.success("Lead inscrito na sequência.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao inscrever lead."),
  });
}

export function useLeadSequenceRuns(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leadchef-lead-runs", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_sequence_runs")
        .select("*, leadchef_sequences(name)")
        .eq("lead_id", leadId)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        sequence_id: string;
        status: string;
        current_step_order: number;
        next_run_at: string;
        leadchef_sequences: { name: string } | null;
      }>;
    },
  });
}
