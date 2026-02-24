import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ExtensionAuditEntry {
  id: string;
  extension_key: string;
  action: string;
  user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useExtensionAuditLog() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery<ExtensionAuditEntry[]>({
    queryKey: ["extension-audit-log", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_audit_logs")
        .select("id, extension_key, action, user_id, metadata, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ExtensionAuditEntry[];
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  });
}
