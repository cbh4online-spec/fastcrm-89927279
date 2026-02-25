import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface CompanyAuditLogEntry {
  id: string;
  workspace_id: string;
  company_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
}

export function useCompanyAuditLog(companyId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["company-audit-log", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await workspaceClient
        .from("companies_audit_log")
        .select("*")
        .eq("company_id", companyId)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as CompanyAuditLogEntry[];
    },
    enabled: !!companyId,
  });
}
