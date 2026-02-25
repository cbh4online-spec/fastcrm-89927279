import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LeadRoutingRule {
  id: string;
  workspace_id: string;
  name: string;
  score_min: number;
  score_max: number;
  action_type: string;
  action_config: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeadRoutingRules() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["lead-routing-rules", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadRoutingRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (rule: Omit<LeadRoutingRule, "id" | "workspace_id" | "created_at" | "updated_at">) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .insert({
          name: rule.name,
          score_min: rule.score_min,
          score_max: rule.score_max,
          action_type: rule.action_type,
          action_config: rule.action_config as any,
          priority: rule.priority,
          is_active: rule.is_active,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-routing-rules"] });
      toast.success("Regra de routing criada");
    },
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadRoutingRule> & { id: string }) => {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.score_min !== undefined) updatePayload.score_min = updates.score_min;
      if (updates.score_max !== undefined) updatePayload.score_max = updates.score_max;
      if (updates.action_type !== undefined) updatePayload.action_type = updates.action_type;
      if (updates.action_config !== undefined) updatePayload.action_config = updates.action_config;
      if (updates.priority !== undefined) updatePayload.priority = updates.priority;
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-routing-rules"] });
      toast.success("Regra atualizada");
    },
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-routing-rules"] });
      toast.success("Regra removida");
    },
  });
}
