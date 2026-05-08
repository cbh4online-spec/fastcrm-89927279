import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  LeadChefActivityType,
  LeadChefReferral,
  LeadChefTemperature,
} from "@/types/leadchef";

export interface ConvertReferralInput {
  referral: LeadChefReferral;
  /** Sobrescreve o nome se necessário. */
  name?: string;
  phone?: string;
  email?: string;
  interest?: string;
  origin?: string;
  temperature?: LeadChefTemperature;
  nextActionType?: LeadChefActivityType;
  nextActionAt?: string | null;
  nextActionNote?: string;
  /** Confirmação explícita de autorização do utilizador. */
  authorizationConfirmed: boolean;
}

export function useConvertLeadChefReferralToLead() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ConvertReferralInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      if (!user?.id) throw new Error("Sessão expirada.");
      const ref = input.referral;
      const isAuthorized = ref.authorization_status === "granted" || input.authorizationConfirmed;
      if (!isAuthorized) {
        throw new Error("Confirma a autorização da pessoa antes de converter.");
      }

      const name = (input.name ?? ref.name).trim();
      const phone = (input.phone ?? ref.phone ?? "").trim() || null;
      const email = (input.email ?? ref.email ?? "").trim() || null;
      const origin = input.origin || "Referência";
      const temperature: LeadChefTemperature = input.temperature ?? "warm";

      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          phone,
          email,
          source: origin,
          status: "new",
          ai_temperature: temperature,
          created_by: user.id,
        } as any)
        .select("id")
        .single();
      if (leadErr) throw leadErr;

      const { data: profile, error: profErr } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: lead.id,
          stage: "to_contact",
          interest: input.interest || null,
          origin,
          temperature,
          next_action_type: input.nextActionType || "phone_call",
          next_action_at: input.nextActionAt || null,
          next_action_note: input.nextActionNote || `Referência indicada por contacto.`,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (profErr) throw profErr;

      // Atualizar referência
      const { error: refErr } = await (supabase as any)
        .from("leadchef_referrals")
        .update({
          status: "converted",
          converted_lead_id: lead.id,
          authorization_status: ref.authorization_status === "granted" ? "granted" : "granted",
        })
        .eq("id", ref.id)
        .eq("workspace_id", currentWorkspace.id);
      if (refErr) throw refErr;

      // Histórico no lead novo
      try {
        await supabase.from("crm_activities").insert({
          workspace_id: currentWorkspace.id,
          entity_type: "lead",
          entity_id: lead.id,
          lead_id: lead.id,
          activity_type: "note",
          title: `LeadChef: lead criado a partir de referência`,
          description: ref.notes || null,
          metadata: {
            source: "leadchef",
            referral_id: ref.id,
            referrer_lead_id: ref.referred_by_lead_id,
          },
          performed_by: user.id,
        } as any);
      } catch (e) {
        console.warn("[LeadChef] histórico convert referral falhou", e);
      }

      return { leadId: lead.id, profileId: profile.id, referralId: ref.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-referrals"] });
      qc.invalidateQueries({ queryKey: ["leadchef-referral"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Referência convertida em lead.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível converter."),
  });
}
