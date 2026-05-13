import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { LeadChefSocialValues } from "@/components/leadchef/LeadChefSocialLinksCard";

export function useUpdateLeadChefLeadSocials() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ profileId, values }: { profileId: string; values: LeadChefSocialValues }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .update({
          instagram_handle: values.instagram_handle,
          facebook_url: values.facebook_url,
          tiktok_handle: values.tiktok_handle,
          linkedin_url: values.linkedin_url,
        })
        .eq("id", profileId)
        .eq("workspace_id", currentWorkspace.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      toast.success("Redes sociais atualizadas.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível guardar."),
  });
}
