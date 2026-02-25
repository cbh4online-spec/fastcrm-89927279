import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface LeadAuditLogEntry {
  id: string;
  workspace_id: string;
  lead_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
}

export function useLeadAuditLog(leadId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["lead-audit-log", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await workspaceClient
        .from("leads_audit_log" as any)
        .select("*")
        .eq("lead_id", leadId)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as LeadAuditLogEntry[];
    },
    enabled: !!leadId,
  });
}
