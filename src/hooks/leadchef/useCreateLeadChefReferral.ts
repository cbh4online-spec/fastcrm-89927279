import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  LeadChefAuthorizationStatus,
  LeadChefReferral,
} from "@/types/leadchef";

export interface CreateLeadChefReferralInput {
  name: string;
  phone?: string;
  email?: string;
  referred_by_lead_id?: string | null;
  referred_by_contact_id?: string | null;
  authorization_status?: LeadChefAuthorizationStatus;
  context?: string; // junta-se às notas
  interest?: string; // junta-se às notas
  notes?: string;
}

export function useCreateLeadChefReferral() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeadChefReferralInput): Promise<LeadChefReferral> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");

      const noteParts: string[] = [];
      if (input.context) noteParts.push(`Contexto: ${input.context}`);
      if (input.interest) noteParts.push(`Interesse: ${input.interest}`);
      if (input.notes) noteParts.push(input.notes);
      const composedNotes = noteParts.join("\n").trim() || null;

      const auth = input.authorization_status ?? "unknown";

      const { data, error } = await (supabase as any)
        .from("leadchef_referrals")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          referred_by_lead_id: input.referred_by_lead_id || null,
          referred_by_contact_id: input.referred_by_contact_id || null,
          authorization_status: auth,
          status: auth === "denied" ? "no_authorization" : "received",
          notes: composedNotes,
          created_by: user?.id || null,
        })
        .select("*")
        .single();
      if (error) throw error;

      // Histórico no lead que indicou (best-effort)
      if (input.referred_by_lead_id) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: currentWorkspace.id,
            entity_type: "lead",
            entity_id: input.referred_by_lead_id,
            lead_id: input.referred_by_lead_id,
            activity_type: "note",
            title: `LeadChef: nova referência — ${input.name}`,
            description: composedNotes,
            metadata: {
              source: "leadchef",
              referral_id: data.id,
              authorization_status: auth,
            },
            performed_by: user?.id || null,
          } as any);
        } catch (e) {
          console.warn("[LeadChef] falha ao registar histórico de referência", e);
        }
      }

      return data as LeadChefReferral;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-referrals"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-monthly-progress"] });
      qc.invalidateQueries({ queryKey: ["leadchef-dashboard"] });
      toast.success("Referência registada.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível registar a referência."),
  });
}
