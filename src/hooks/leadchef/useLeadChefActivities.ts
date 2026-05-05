import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useLeadChefActivities(leadId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-activities", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
