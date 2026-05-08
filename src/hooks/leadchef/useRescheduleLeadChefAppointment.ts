import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefAppointment } from "@/types/leadchef";

interface Input {
  appointment: LeadChefAppointment;
  scheduled_at: string;
  reason?: string;
  /** Atualizar próxima ação do lead com a nova data */
  updateNextAction?: boolean;
}

export function useRescheduleLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ appointment, scheduled_at, reason, updateNextAction }: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      const history = Array.isArray((appointment.metadata as any)?.reschedule_history)
        ? ((appointment.metadata as any).reschedule_history as any[])
        : [];

      const { error } = await (supabase as any)
        .from("leadchef_appointments")
        .update({
          scheduled_at,
          status: "scheduled",
          metadata: {
            ...(appointment.metadata || {}),
            reschedule_history: [
              ...history,
              { from: appointment.scheduled_at, to: scheduled_at, reason: reason || null, at: new Date().toISOString() },
            ],
          },
        })
        .eq("id", appointment.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      if (updateNextAction && appointment.profile_id) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({
            next_action_type: appointment.type,
            next_action_at: scheduled_at,
            next_action_note: appointment.title,
          })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId);
      }

      if (appointment.lead_id) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: workspaceId,
            entity_type: "lead",
            entity_id: appointment.lead_id,
            lead_id: appointment.lead_id,
            activity_type: "meeting_scheduled",
            title: `LeadChef: ${appointment.title} — reagendado`,
            description: reason || null,
            metadata: {
              source: "leadchef",
              appointment_id: appointment.id,
              reschedule_from: appointment.scheduled_at,
              reschedule_to: scheduled_at,
            },
            performed_by: user?.id || null,
          } as any);
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-activities"] });
      toast.success("Compromisso reagendado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao reagendar."),
  });
}
