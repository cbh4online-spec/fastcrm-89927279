import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefClientStatus } from "@/components/leadchef/constants";

export interface UpdateLeadChefClientStatusInput {
  leadId: string;
  status?: LeadChefClientStatus;
  postSaleStatus?: string | null;
  nextFollowUpAt?: string | null;
  customerCycle?: Record<string, any>;
  potentialReferral?: boolean;
  potentialRecruitment?: boolean;
  notes?: string | null;
}

export function useUpdateLeadChefClientStatus() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateLeadChefClientStatusInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        lead_id: input.leadId,
        created_by: user?.id || null,
      };
      if (input.status) payload.status = input.status;
      if (input.postSaleStatus !== undefined) payload.post_sale_status = input.postSaleStatus;
      if (input.nextFollowUpAt !== undefined) payload.next_follow_up_at = input.nextFollowUpAt;
      if (input.customerCycle !== undefined) payload.customer_cycle = input.customerCycle;
      if (input.potentialReferral !== undefined) payload.potential_referral = input.potentialReferral;
      if (input.potentialRecruitment !== undefined) payload.potential_recruitment = input.potentialRecruitment;
      if (input.notes !== undefined) payload.notes = input.notes;

      const { data, error } = await (supabase as any)
        .from("leadchef_client_profiles")
        .upsert(payload, { onConflict: "workspace_id,lead_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-clients"] });
      qc.invalidateQueries({ queryKey: ["leadchef-client"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-monthly-progress"] });
      toast.success("Cliente atualizado.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível atualizar o cliente."),
  });
}
