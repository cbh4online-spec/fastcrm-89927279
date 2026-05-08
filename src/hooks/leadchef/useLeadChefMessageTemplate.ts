import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

export function useLeadChefMessageTemplate(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-message-template", workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async (): Promise<LeadChefMessageTemplate | null> => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("leadchef_message_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as LeadChefMessageTemplate | null) ?? null;
    },
  });
}
