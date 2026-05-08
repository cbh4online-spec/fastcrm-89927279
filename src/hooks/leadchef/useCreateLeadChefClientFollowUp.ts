import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefAppointmentType } from "@/types/leadchef";

export interface CreateLeadChefClientFollowUpInput {
  leadId: string;
  profileId?: string | null;
  type: LeadChefAppointmentType;
  title: string;
  scheduled_at: string;
  notes?: string;
  /** Marca o cliente como post_sale_pending. */
  markPostSalePending?: boolean;
}

export function useCreateLeadChefClientFollowUp() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeadChefClientFollowUpInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");

      const { data, error } = await (supabase as any)
        .from("leadchef_appointments")
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: input.leadId,
          profile_id: input.profileId || null,
          type: input.type,
          status: "scheduled",
          title: input.title,
          notes: input.notes || null,
          scheduled_at: input.scheduled_at,
          metadata: { source: "leadchef-client" },
          created_by: user?.id || null,
        })
        .select("*")
        .single();
      if (error) throw error;

      if (input.markPostSalePending) {
        await (supabase as any)
          .from("leadchef_client_profiles")
          .upsert({
            workspace_id: currentWorkspace.id,
            lead_id: input.leadId,
            status: "post_sale_pending",
            post_sale_status: "scheduled",
            next_follow_up_at: input.scheduled_at,
            created_by: user?.id || null,
          }, { onConflict: "workspace_id,lead_id" });
      }

      try {
        await supabase.from("crm_activities").insert({
          workspace_id: currentWorkspace.id,
          entity_type: "lead",
          entity_id: input.leadId,
          lead_id: input.leadId,
          activity_type: "meeting_scheduled",
          title: `LeadChef cliente: ${input.title}`,
          description: input.notes || null,
          metadata: {
            source: "leadchef-client",
            appointment_id: data.id,
            appointment_type: input.type,
          },
          performed_by: user?.id || null,
        } as any);
      } catch (e) {
        console.warn("[LeadChef] histórico follow-up cliente falhou", e);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-client-followups"] });
      qc.invalidateQueries({ queryKey: ["leadchef-client"] });
      qc.invalidateQueries({ queryKey: ["leadchef-clients"] });
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Acompanhamento criado.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível criar o acompanhamento."),
  });
}
