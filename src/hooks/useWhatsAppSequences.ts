import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WhatsAppSequence {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_config: Record<string, any>;
  is_enabled: boolean;
  send_window_start: string | null;
  send_window_end: string | null;
  stop_on_reply: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_minutes: number;
  message_body: string;
  template_id: string | null;
  media_url: string | null;
  media_type: string | null;
  cta_url: string | null;
  cta_label: string | null;
  metadata: Record<string, any>;
}

export interface WhatsAppSequenceEnrollment {
  id: string;
  workspace_id: string;
  sequence_id: string;
  contact_id: string | null;
  phone: string;
  status: string;
  current_step_order: number;
  next_run_at: string;
  enrolled_at: string;
  completed_at: string | null;
  last_error: string | null;
  metadata: Record<string, any>;
}

export function useWhatsAppSequences() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["wa-sequences", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_sequences")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WhatsAppSequence[];
    },
  });
}

export function useWhatsAppSequenceSteps(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ["wa-sequence-steps", sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WhatsAppSequenceStep[];
    },
  });
}

export function useWhatsAppSequenceEnrollments(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ["wa-sequence-enrollments", sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_sequence_enrollments")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("enrolled_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as WhatsAppSequenceEnrollment[];
    },
  });
}

export function useUpsertWhatsAppSequence() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<WhatsAppSequence> & { id?: string }) => {
      const payload: any = { ...input, workspace_id: currentWorkspace?.id };
      if (input.id) {
        const { error } = await (supabase as any).from("whatsapp_sequences").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await (supabase as any).from("whatsapp_sequences").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-sequences"] });
      toast.success("Sequência guardada.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao guardar."),
  });
}

export function useUpsertWhatsAppSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<WhatsAppSequenceStep> & { sequence_id: string }) => {
      if (input.id) {
        const { error } = await (supabase as any).from("whatsapp_sequence_steps").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("whatsapp_sequence_steps").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["wa-sequence-steps", v.sequence_id] });
      toast.success("Passo guardado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao guardar passo."),
  });
}

export function useDeleteWhatsAppSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; sequence_id: string }) => {
      const { error } = await (supabase as any).from("whatsapp_sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["wa-sequence-steps", v.sequence_id] }),
  });
}

export function useEnrollContactInWhatsAppSequence() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ sequenceId, phone, contactId, name }: { sequenceId: string; phone: string; contactId?: string; name?: string }) => {
      const { error } = await (supabase as any).from("whatsapp_sequence_enrollments").insert({
        workspace_id: currentWorkspace?.id,
        sequence_id: sequenceId,
        phone,
        contact_id: contactId ?? null,
        metadata: name ? { name } : {},
        next_run_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-sequence-enrollments"] });
      toast.success("Contacto inscrito.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao inscrever."),
  });
}
