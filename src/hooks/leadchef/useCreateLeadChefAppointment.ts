import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  LeadChefAppointment,
  LeadChefAppointmentType,
} from "@/types/leadchef";

export interface CreateLeadChefAppointmentInput {
  type: LeadChefAppointmentType;
  title: string;
  scheduled_at: string;
  leadId?: string | null;
  profileId?: string | null;
  notes?: string;
  duration_minutes?: number | null;
  location?: string | null;
  is_online?: boolean;
  metadata?: Record<string, unknown>;
  /** Atualizar próxima ação do lead após criar */
  updateNextAction?: boolean;
}

export function useCreateLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: CreateLeadChefAppointmentInput): Promise<LeadChefAppointment> => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      const { data, error } = await (supabase as any)
        .from("leadchef_appointments")
        .insert({
          workspace_id: workspaceId,
          lead_id: input.leadId || null,
          profile_id: input.profileId || null,
          type: input.type,
          status: "scheduled",
          title: input.title,
          notes: input.notes || null,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes ?? null,
          location: input.location || null,
          is_online: input.is_online ?? false,
          metadata: input.metadata || {},
          created_by: user?.id || null,
        })
        .select("*, lead:leads(id,name,phone,email)")
        .single();
      if (error) throw error;

      // Se demo, mover stage para demo_scheduled
      if (input.type === "demo" && input.profileId) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ stage: "demo_scheduled" })
          .eq("id", input.profileId)
          .eq("workspace_id", workspaceId);
      }

      // Atualizar próxima ação do lead
      if (input.updateNextAction && input.profileId) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({
            next_action_type: input.type,
            next_action_at: input.scheduled_at,
            next_action_note: input.title,
          })
          .eq("id", input.profileId)
          .eq("workspace_id", workspaceId);
      }

      // Histórico best-effort
      if (input.leadId) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: workspaceId,
            entity_type: "lead",
            entity_id: input.leadId,
            lead_id: input.leadId,
            activity_type: "meeting_scheduled",
            title: `LeadChef: ${input.title}`,
            description: input.notes || null,
            metadata: {
              source: "leadchef",
              appointment_id: data.id,
              appointment_type: input.type,
              scheduled_at: input.scheduled_at,
            },
            performed_by: user?.id || null,
          } as any);
        } catch (e) {
          console.warn("[LeadChef] history insert failed", e);
        }
      }

      return data as LeadChefAppointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-activities"] });
      toast.success("Compromisso criado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao criar compromisso."),
  });
}
