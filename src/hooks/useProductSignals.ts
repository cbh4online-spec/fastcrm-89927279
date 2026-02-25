import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ProductSignal {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  contact_id: string | null;
  email: string;
  event_type: string;
  event_data: Record<string, unknown>;
  source: string;
  score_impact: number;
  routing_action: string | null;
  routing_details: Record<string, unknown> | null;
  processed: boolean;
  created_at: string;
}

export function useProductSignals(limit = 20) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-signals", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("product_signals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ProductSignal[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export interface SignalFunnelData {
  signups: number;
  activated: number;
  qualified: number;
  pipeline: number;
}

export function useSignalFunnel() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["signal-funnel", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return { signups: 0, activated: 0, qualified: 0, pipeline: 0 };

      const { data, error } = await supabase
        .from("product_signals")
        .select("event_type, routing_action")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      const signals = data ?? [];
      const signups = signals.filter((s) => s.event_type === "signup").length;
      const activated = signals.filter((s) => s.event_type === "activation").length;
      const qualified = signals.filter(
        (s) => s.routing_action === "assign_owner" || s.routing_action === "create_task"
      ).length;
      const pipeline = signals.filter((s) => s.event_type === "upgrade").length;

      return { signups, activated, qualified, pipeline } as SignalFunnelData;
    },
    enabled: !!currentWorkspace?.id,
  });
}
