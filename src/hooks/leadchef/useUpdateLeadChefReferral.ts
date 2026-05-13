import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type {
  LeadChefAuthorizationStatus,
  LeadChefReferralStatus,
} from "@/types/leadchef";

export interface UpdateLeadChefReferralInput {
  id: string;
  status?: LeadChefReferralStatus;
  authorization_status?: LeadChefAuthorizationStatus;
  notes?: string | null;
  instagram_handle?: string | null;
  facebook_url?: string | null;
  tiktok_handle?: string | null;
  linkedin_url?: string | null;
}

export function useUpdateLeadChefReferral() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: UpdateLeadChefReferralInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const patch: Record<string, unknown> = {};
      if (input.status) patch.status = input.status;
      if (input.authorization_status) patch.authorization_status = input.authorization_status;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.instagram_handle !== undefined) patch.instagram_handle = input.instagram_handle;
      if (input.facebook_url !== undefined) patch.facebook_url = input.facebook_url;
      if (input.tiktok_handle !== undefined) patch.tiktok_handle = input.tiktok_handle;
      if (input.linkedin_url !== undefined) patch.linkedin_url = input.linkedin_url;
      const { data, error } = await (supabase as any)
        .from("leadchef_referrals")
        .update(patch)
        .eq("id", input.id)
        .eq("workspace_id", currentWorkspace.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-referrals"] });
      qc.invalidateQueries({ queryKey: ["leadchef-referral"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Referência atualizada.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível atualizar."),
  });
}
