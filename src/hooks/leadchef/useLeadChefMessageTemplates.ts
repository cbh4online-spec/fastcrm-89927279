import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

interface Options {
  category?: string;
  activeOnly?: boolean;
  search?: string;
}

export function useLeadChefMessageTemplates(opts: Options = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-message-templates", workspaceId, opts.category ?? "all", opts.activeOnly ?? false, opts.search ?? ""],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefMessageTemplate[]> => {
      if (!workspaceId) return [];
      let q = (supabase as any)
        .from("leadchef_message_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
      if (opts.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as LeadChefMessageTemplate[];
      const s = opts.search?.trim().toLowerCase();
      if (s) {
        rows = rows.filter((r) =>
          [r.name, r.body].filter(Boolean).join(" ").toLowerCase().includes(s)
        );
      }
      return rows;
    },
  });
}
