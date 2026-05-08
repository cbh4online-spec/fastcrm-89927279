import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefAppointment } from "@/types/leadchef";

/** Pós-venda e follow-ups do cliente: usa leadchef_appointments associados ao lead. */
export function useLeadChefClientFollowUps(leadId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-client-followups", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async (): Promise<LeadChefAppointment[]> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_appointments")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("lead_id", leadId!)
        .order("scheduled_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LeadChefAppointment[];
    },
  });
}
