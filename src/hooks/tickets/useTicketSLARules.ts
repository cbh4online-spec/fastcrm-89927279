import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SLARule {
  id: string;
  workspace_id: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  escalation_after_hours: number | null;
  escalate_to: string | null;
  is_active: boolean;
  created_at: string;
}

export function useTicketSLARules() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ticket-sla-rules", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_sla_rules")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("priority");
      if (error) throw error;
      return (data || []) as SLARule[];
    },
    enabled: !!workspaceId,
  });

  const upsert = useMutation({
    mutationFn: async (rule: Partial<SLARule> & { priority: string }) => {
      const { data, error } = await supabase
        .from("ticket_sla_rules")
        .upsert(
          { ...rule, workspace_id: workspaceId! },
          { onConflict: "workspace_id,priority" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-sla-rules"] });
    },
  });

  return { rules: query.data || [], isLoading: query.isLoading, upsert };
}
