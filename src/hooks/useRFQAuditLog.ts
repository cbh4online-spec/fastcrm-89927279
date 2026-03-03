import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RFQAuditLogEntry {
  id: string;
  workspace_id: string;
  rfq_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  profile?: { email: string } | null;
}

export function useRFQAuditLog(rfqId: string | undefined) {
  return useQuery({
    queryKey: ["rfq-audit-log", rfqId],
    queryFn: async () => {
      if (!rfqId) return [];

      const { data, error } = await (supabase
        .from("rfq_audit_log" as any)
        .select("*, profile:changed_by(email)")
        .eq("rfq_id", rfqId)
        .order("changed_at", { ascending: false })
        .limit(200) as any);

      if (error) throw error;
      return (data || []) as RFQAuditLogEntry[];
    },
    enabled: !!rfqId,
  });
}
