import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  LeadChefAppointment,
  LeadChefAppointmentOutcome,
  LeadChefAppointmentType,
  LeadChefStage,
} from "@/types/leadchef";

interface Input {
  appointment: LeadChefAppointment;
  outcome: LeadChefAppointmentOutcome;
  notes?: string;
  /** Próxima ação a criar opcionalmente */
  nextAction?: {
    type: LeadChefAppointmentType;
    scheduled_at: string;
    note?: string;
  } | null;
}

const OUTCOME_TO_STAGE: Partial<Record<LeadChefAppointmentOutcome, LeadChefStage>> = {
  proposal_sent: "proposal_decision",
  won: "won",
  no_interest: "lost",
};

export function useCompleteLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ appointment, outcome, notes, nextAction }: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      const newNotes = notes
        ? appointment.notes
          ? `${appointment.notes}\n\n${notes}`
          : notes
        : appointment.notes;

      const { error } = await (supabase as any)
        .from("leadchef_appointments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          outcome,
          notes: newNotes,
        })
        .eq("id", appointment.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      // Atualizações de stage automáticas
      let nextStage: LeadChefStage | null = OUTCOME_TO_STAGE[outcome] ?? null;
      if (appointment.type === "demo" && outcome === "done") nextStage = "demo_done";

      if (nextStage && appointment.profile_id) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ stage: nextStage })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId);

        if ((nextStage === "won" || nextStage === "lost") && appointment.lead_id) {
          await supabase
            .from("leads")
            .update({ status: "completed" } as any)
            .eq("id", appointment.lead_id)
            .eq("workspace_id", workspaceId);
        }
      }

      // Próxima ação
      if (nextAction && appointment.profile_id) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({
            next_action_type: nextAction.type,
            next_action_at: nextAction.scheduled_at,
            next_action_note: nextAction.note || null,
          })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId);
      } else if (appointment.profile_id) {
        // Limpar next action se ela apontava para este compromisso
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ next_action_at: null, next_action_type: null, next_action_note: null })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId)
          .eq("next_action_at", appointment.scheduled_at);
      }

      // Histórico
      if (appointment.lead_id) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: workspaceId,
            entity_type: "lead",
            entity_id: appointment.lead_id,
            lead_id: appointment.lead_id,
            activity_type: "meeting_completed",
            title: `LeadChef: ${appointment.title} — concluído`,
            description: notes || null,
            metadata: {
              source: "leadchef",
              appointment_id: appointment.id,
              outcome,
              new_stage: nextStage,
            },
            performed_by: user?.id || null,
          } as any);
        } catch (e) {
          console.warn("[LeadChef] history insert failed", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-activities"] });
      toast.success("Compromisso concluído.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao concluir compromisso."),
  });
}
