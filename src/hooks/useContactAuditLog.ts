import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  contact_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
}

export function useContactAuditLog(contactId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["contact-audit-log", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await workspaceClient
        .from("contact_audit_log")
        .select("*")
        .eq("contact_id", contactId)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!contactId,
  });
}
