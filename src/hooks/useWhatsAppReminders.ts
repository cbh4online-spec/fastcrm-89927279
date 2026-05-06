import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReminderStatus = "scheduled" | "pending" | "sent" | "failed" | "cancelled" | "skipped";
export type ReminderType =
  | "confirmation"
  | "reminder_24h"
  | "reminder_2h"
  | "reminder_1h"
  | "reminder_15m"
  | "followup_after"
  | "no_response_followup";

export interface WhatsAppReminder {
  id: string;
  workspace_id: string;
  appointment_id: string | null;
  conversation_id: string | null;
  contact_id: string | null;
  channel: string;
  reminder_type: ReminderType | string;
  message_content: string;
  to_phone: string | null;
  due_at: string;
  sent_at: string | null;
  status: ReminderStatus | string;
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const FIELDS =
  "id, workspace_id, appointment_id, conversation_id, contact_id, channel, reminder_type, message_content, to_phone, due_at, sent_at, status, attempts, last_error, provider_message_id, metadata, created_at, updated_at";

export function useWhatsAppReminders(opts: {
  appointment_id?: string | null;
  status?: ReminderStatus[];
  limit?: number;
} = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-reminders", currentWorkspace?.id, opts],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [] as WhatsAppReminder[];
      let q = supabase
        .from("whatsapp_scheduled_reminders" as never)
        .select(FIELDS)
        .eq("workspace_id", currentWorkspace.id)
        .order("due_at", { ascending: true })
        .limit(opts.limit ?? 100);

      if (opts.appointment_id) q = q.eq("appointment_id", opts.appointment_id);
      if (opts.status && opts.status.length > 0) q = q.in("status", opts.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppReminder[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useProcessPendingReminders() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace ativo");
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-send-scheduled-reminders",
        { body: { workspace_id: currentWorkspace.id, manual: true } },
      );
      if (error) throw error;
      return data as { processed: number; sent: number; failed: number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-reminders"] });
      toast.success(
        `Lembretes processados: ${res?.sent ?? 0} enviados, ${res?.failed ?? 0} falhados`,
      );
    },
    onError: (e: Error) => {
      toast.error("Erro ao processar lembretes", { description: e.message });
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_scheduled_reminders" as never)
        .update({ status: "cancelled" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-reminders"] });
      toast.success("Lembrete cancelado");
    },
  });
}
