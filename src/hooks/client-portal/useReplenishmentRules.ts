import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { toast } from "sonner";

interface ReplenishmentRule {
  id: string;
  workspace_id: string;
  company_id: string;
  scope: string;
  reference_id: string;
  reorder_threshold_days: number;
  min_qty_suggestion: number;
  is_active: boolean;
}

export function useReplenishmentRules() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();
  const companyId = clientUser?.company_id;
  const workspaceId = clientUser?.workspace_id;

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["client-replenishment-rules", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("client_replenishment_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReplenishmentRule[];
    },
    enabled: !!companyId,
  });

  const addRule = useMutation({
    mutationFn: async (rule: { scope: string; reference_id: string; reorder_threshold_days?: number; min_qty_suggestion?: number }) => {
      if (!companyId || !workspaceId) throw new Error("No company");
      const { error } = await supabase.from("client_replenishment_rules").insert({
        workspace_id: workspaceId,
        company_id: companyId,
        ...rule,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-replenishment-rules"] });
      toast.success("Regra adicionada!");
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("client_replenishment_rules").delete().eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-replenishment-rules"] });
      toast.success("Regra removida!");
    },
  });

  return { rules, isLoading, addRule: addRule.mutateAsync, deleteRule: deleteRule.mutateAsync };
}
