import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const sb = supabase as any;

export function useCheckoutSessions(filters?: { status?: string; funnelId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["checkout-sessions", wid, filters],
    queryFn: async () => {
      let q = sb.from("checkout_sessions").select("*, funnel:checkout_funnels(name, slug)").eq("workspace_id", wid).order("created_at", { ascending: false }).limit(200);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.funnelId) q = q.eq("funnel_id", filters.funnelId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });
}
