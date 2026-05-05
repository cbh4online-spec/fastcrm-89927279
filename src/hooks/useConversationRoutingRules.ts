import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type AssignmentStrategy = "specific_user" | "round_robin" | "least_busy" | "commercial_profile";

export interface ConversationRoutingRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  match_intents: string[];
  match_priorities: string[];
  match_sentiments: string[];
  match_tags: string[];
  match_channels: string[];
  min_value: number | null;
  assignment_strategy: AssignmentStrategy;
  assign_to_user_id: string | null;
  assign_to_user_ids: string[];
  assign_to_profile: string | null;
  add_tags: string[];
  set_priority: string | null;
  notify_user: boolean;
  created_at: string;
  updated_at: string;
}

export type RoutingRuleInput = Omit<ConversationRoutingRule, "id" | "workspace_id" | "created_at" | "updated_at">;

export function useConversationRoutingRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["conversation-routing-rules", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("conversation_routing_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as ConversationRoutingRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<RoutingRuleInput> & { name: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("conversation_routing_rules")
        .insert({ workspace_id: currentWorkspace.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-routing-rules"] });
      toast.success("Regra criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar regra"),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ConversationRoutingRule> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("conversation_routing_rules")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-routing-rules"] });
      toast.success("Regra atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar regra"),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("conversation_routing_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-routing-rules"] });
      toast.success("Regra removida");
    },
  });
}

export function useRoutingLog(conversationId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["conversation-routing-log", conversationId, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = (supabase as any)
        .from("conversation_routing_log")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (conversationId) q = q.eq("conversation_id", conversationId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

/** Manually trigger auto-routing for a conversation (also called from inbound hooks) */
export async function triggerAutoRoute(conversationId: string, workspaceId: string) {
  const { data, error } = await supabase.functions.invoke("auto-route-conversation", {
    body: { conversation_id: conversationId, workspace_id: workspaceId },
  });
  if (error) throw error;
  return data;
}
