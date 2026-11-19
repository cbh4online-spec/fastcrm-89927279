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

const IGNORED_FIELDS = new Set(["updated_at", "search_norm"]);

/** Reads the shared audit trail (activity_logs) and expands it into one row per changed field. */
export function useLeadAuditLog(leadId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["lead-audit-log", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await workspaceClient
        .from("activity_logs")
        .select("id, workspace_id, user_id, action, changed_fields, old_data, new_data, created_at")
        .eq("table_name", "leads")
        .eq("record_id", leadId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const entries: LeadAuditLogEntry[] = [];
      for (const log of (data || []) as any[]) {
        const base = {
          workspace_id: log.workspace_id,
          lead_id: leadId,
          changed_by: log.user_id,
          changed_at: log.created_at,
        };
        if (log.action === "INSERT") {
          entries.push({ ...base, id: log.id, field_name: "Registo criado", old_value: null, new_value: log.new_data?.name ?? null });
        } else if (log.action === "DELETE") {
          entries.push({ ...base, id: log.id, field_name: "Registo eliminado", old_value: log.old_data?.name ?? null, new_value: null });
        } else {
          const fields: string[] = (log.changed_fields || []).filter((f: string) => !IGNORED_FIELDS.has(f));
          for (const f of fields) {
            entries.push({ ...base, id: `${log.id}:${f}`, field_name: f, old_value: log.old_data?.[f], new_value: log.new_data?.[f] });
          }
        }
      }
      return entries;
    },
    enabled: !!leadId,
  });
}
