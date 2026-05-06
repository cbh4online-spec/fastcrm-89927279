import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppointmentType =
  | "phone_call"
  | "whatsapp_call"
  | "whatsapp_video_call"
  | "online_meeting"
  | "in_person_meeting"
  | "demo"
  | "consultation"
  | "support"
  | "sales_followup"
  | "proposal_review"
  | "other";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type ReminderOffset = "reminder_24h" | "reminder_2h" | "reminder_1h" | "reminder_15m";

export interface WhatsAppAppointment {
  id: string;
  workspace_id: string;
  calendar_id: string | null;
  conversation_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  assigned_to: string | null;
  appointment_type: AppointmentType | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  timezone: string | null;
  location: string | null;
  meeting_url: string | null;
  status: AppointmentStatus | string;
  confirmation_sent_at: string | null;
  reminder_settings: Record<string, unknown>;
  internal_notes: string | null;
  outcome: string | null;
  completed_at: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const APPOINTMENT_FIELDS =
  "id, workspace_id, calendar_id, conversation_id, contact_id, lead_id, opportunity_id, assigned_to, appointment_type, title, description, start_time, end_time, duration_minutes, timezone, location, meeting_url, status, confirmation_sent_at, reminder_settings, internal_notes, outcome, completed_at, source, metadata, created_by, created_at, updated_at";

export interface AppointmentFilters {
  status?: AppointmentStatus[] | null;
  assigned_to?: string | null;
  type?: AppointmentType | null;
  conversation_id?: string | null;
  contact_id?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
}

/** Lista agendamentos do workspace (apenas os com appointment_type definido). */
export function useWhatsAppAppointments(filters: AppointmentFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-appointments", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [] as WhatsAppAppointment[];
      let query = supabase
        .from("calendar_events" as never)
        .select(APPOINTMENT_FIELDS)
        .eq("workspace_id", currentWorkspace.id)
        .not("appointment_type", "is", null)
        .order("start_time", { ascending: true })
        .limit(filters.limit ?? 200);

      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status as string[]);
      }
      if (filters.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
      if (filters.type) query = query.eq("appointment_type", filters.type);
      if (filters.conversation_id) query = query.eq("conversation_id", filters.conversation_id);
      if (filters.contact_id) query = query.eq("contact_id", filters.contact_id);
      if (filters.from) query = query.gte("start_time", filters.from);
      if (filters.to) query = query.lte("start_time", filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppAppointment[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAppointmentsForConversation(conversationId: string | null | undefined) {
  return useWhatsAppAppointments({ conversation_id: conversationId ?? null, limit: 50 });
}

export interface CreateAppointmentInput {
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  opportunity_id?: string | null;
  assigned_to?: string | null;
  appointment_type: AppointmentType;
  title: string;
  description?: string | null;
  scheduled_start: string; // ISO
  duration_minutes?: number;
  timezone?: string;
  location?: string | null;
  meeting_link?: string | null;
  internal_notes?: string | null;
  reminders?: ReminderOffset[];
  send_confirmation?: boolean;
  confirmation_message?: string | null;
  to_phone?: string | null;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace ativo");

      const { data, error } = await supabase.functions.invoke("communication-create-appointment", {
        body: {
          workspace_id: currentWorkspace.id,
          ...input,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-followups"] });
      toast.success("Agendamento criado");
    },
    onError: (e: Error) => {
      toast.error("Não foi possível criar o agendamento", {
        description: e.message,
      });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: AppointmentStatus;
      outcome?: string | null;
      internal_notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = { status: input.status };
      if (input.status === "completed") patch.completed_at = new Date().toISOString();
      if (input.outcome !== undefined) patch.outcome = input.outcome;
      if (input.internal_notes !== undefined) patch.internal_notes = input.internal_notes;

      const { data, error } = await supabase
        .from("calendar_events" as never)
        .update(patch)
        .eq("id", input.id)
        .select(APPOINTMENT_FIELDS)
        .single();
      if (error) throw error;
      return data as unknown as WhatsAppAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-appointments"] });
      toast.success("Estado do agendamento atualizado");
    },
    onError: (e: Error) => {
      toast.error("Erro ao atualizar agendamento", { description: e.message });
    },
  });
}
