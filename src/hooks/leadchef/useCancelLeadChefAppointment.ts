import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefAppointment } from "@/types/leadchef";

interface Input {
  appointment: LeadChefAppointment;
  reason?: string;
}

export function useCancelLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ appointment, reason }: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const { error } = await (supabase as any)
        .from("leadchef_appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          metadata: { ...(appointment.metadata || {}), cancel_reason: reason || null },
        })
        .eq("id", appointment.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      if (appointment.lead_id) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: workspaceId,
            entity_type: "lead",
            entity_id: appointment.lead_id,
            lead_id: appointment.lead_id,
            activity_type: "meeting_cancelled",
            title: `LeadChef: ${appointment.title} — cancelado`,
            description: reason || null,
            metadata: { source: "leadchef", appointment_id: appointment.id, reason },
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
      toast.success("Compromisso cancelado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao cancelar compromisso."),
  });
}
