import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface WhatsAppOpsOverall {
  total_conversations: number;
  responded: number;
  pending_response: number;
  avg_first_response_minutes: number | null;
  median_first_response_minutes: number | null;
  p90_first_response_minutes: number | null;
  within_sla: number;
  sla_breached: number;
  sla_compliance_pct: number | null;
  sla_minutes: number;
}

export interface WhatsAppOpsBySource {
  source: string;
  conversations: number;
  conversions: number;
  conversion_rate_pct: number;
  converted_value: number;
}

export interface WhatsAppOpsByDay {
  day: string;
  conversations: number;
  avg_first_response_minutes: number | null;
  within_sla: number;
}

export interface WhatsAppOpsByAgent {
  agent_id: string;
  agent_name: string;
  conversations: number;
  avg_first_response_minutes: number | null;
  within_sla: number;
  conversions: number;
}

export interface WhatsAppOpsDashboardData {
  overall: WhatsAppOpsOverall;
  by_source: WhatsAppOpsBySource[];
  by_day: WhatsAppOpsByDay[];
  by_agent: WhatsAppOpsByAgent[];
  window: { from: string; to: string; sla_minutes: number };
}

export function useWhatsAppOpsDashboard(opts: {
  fromDays?: number;
  slaMinutes?: number;
} = {}) {
  const { fromDays = 30, slaMinutes = 15 } = opts;
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["whatsapp-ops-dashboard", currentWorkspace?.id, fromDays, slaMinutes],
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<WhatsAppOpsDashboardData> => {
      const from = new Date(Date.now() - fromDays * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();
      const { data, error } = await supabase.rpc("whatsapp_ops_dashboard" as never, {
        p_workspace_id: currentWorkspace!.id,
        p_from: from,
        p_to: to,
        p_sla_minutes: slaMinutes,
      } as never);
      if (error) throw error;
      return data as unknown as WhatsAppOpsDashboardData;
    },
  });
}
