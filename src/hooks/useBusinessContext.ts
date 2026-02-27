import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BusinessContext {
  id: string;
  workspace_id: string;
  business_model: string | null;
  business_description: string | null;
  icp_description: string | null;
  icp_industries: string[] | null;
  icp_company_size: string | null;
  icp_decision_maker: string | null;
  icp_pain_points: string[] | null;
  offers: Array<{ name: string; price: string; type: string; description: string }>;
  pricing_model: string | null;
  average_ticket: number | null;
  sales_process_steps: string[] | null;
  sales_cycle_days: number | null;
  objections_common: string[] | null;
  scripts: Array<{ name: string; content: string; stage: string }>;
  follow_up_sla_hours: number | null;
  monthly_revenue_target: number | null;
  quarterly_revenue_target: number | null;
  annual_revenue_target: number | null;
  deals_target_monthly: number | null;
  team_size: number | null;
  team_roles: string[] | null;
  active_strategies: string[] | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessContextUpdate = Partial<Omit<BusinessContext, "id" | "workspace_id" | "created_at" | "updated_at">>;

export function useBusinessContext() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["business-context", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("business_context" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BusinessContext | null;
    },
    enabled: !!workspaceId,
  });

  const upsert = useMutation({
    mutationFn: async (updates: BusinessContextUpdate) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: existing } = await supabase
        .from("business_context" as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("business_context" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_context" as any)
          .insert({ workspace_id: workspaceId, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-context", workspaceId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao guardar contexto: " + err.message);
    },
  });

  const isConfigured = query.data?.onboarding_completed === true;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isConfigured,
    upsert,
  };
}
