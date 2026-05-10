import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduledWhatsAppMessage {
  id: string;
  workspace_id: string;
  created_by: string;
  conversation_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  to_phone: string;
  body: string;
  media_url: string | null;
  media_mime_type: string | null;
  scheduled_at: string;
  timezone: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  external_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ScheduleStatusFilter = "all" | "pending" | "sent" | "failed" | "cancelled";

export function useScheduledWhatsAppMessages(status: ScheduleStatusFilter = "all") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-scheduled", currentWorkspace?.id, status],
    enabled: !!currentWorkspace?.id,
    staleTime: 15_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("whatsapp_scheduled_messages")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("scheduled_at", { ascending: true })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ScheduledWhatsAppMessage[];
    },
  });
}

export interface ScheduleMessageInput {
  to_phone: string;
  body: string;
  scheduled_at: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  timezone?: string;
}

export function useScheduleWhatsAppMessage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ScheduleMessageInput) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sem workspace ou utilizador");
      if (!input.to_phone || !input.body || !input.scheduled_at) {
        throw new Error("Telefone, mensagem e data são obrigatórios");
      }
      if (new Date(input.scheduled_at).getTime() <= Date.now()) {
        throw new Error("A data deve ser futura");
      }
      const { data, error } = await (supabase as any)
        .from("whatsapp_scheduled_messages")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          to_phone: input.to_phone,
          body: input.body,
          scheduled_at: input.scheduled_at,
          conversation_id: input.conversation_id ?? null,
          contact_id: input.contact_id ?? null,
          lead_id: input.lead_id ?? null,
          media_url: input.media_url ?? null,
          media_mime_type: input.media_mime_type ?? null,
          timezone: input.timezone ?? "Europe/Lisbon",
        })
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledWhatsAppMessage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
      toast.success("Mensagem agendada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao agendar"),
  });
}

export function useCancelScheduledMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
      toast.success("Agendamento cancelado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cancelar"),
  });
}

export function useDeleteScheduledMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("whatsapp_scheduled_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
      toast.success("Agendamento removido");
    },
  });
}
