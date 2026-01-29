/**
 * Hook for managing Conversation Rules (DO/DONT/STOP/REDIRECT/ESCALATE)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ConversationRule, ConversationRuleInsert, ConversationRuleUpdate, ConversationRuleType } from "@/types/conversational-engine";

export function useConversationRules(ruleType?: ConversationRuleType) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["conversation-rules", currentWorkspace?.id, ruleType],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      let query = supabase
        .from("conversation_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (ruleType) {
        query = query.eq("rule_type", ruleType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ConversationRule[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<ConversationRuleInsert, "workspace_id" | "created_by">) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Workspace ou utilizador não selecionado");

      const { data, error } = await supabase
        .from("conversation_rules")
        .insert({
          ...rule,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-rules"] });
      toast.success("Regra criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar regra: " + error.message);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: ConversationRuleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("conversation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-rules"] });
      toast.success("Regra atualizada");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conversation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-rules"] });
      toast.success("Regra eliminada");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar: " + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("conversation_rules")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-rules"] });
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Group rules by type
  const rulesByType = {
    DO: rules.filter((r) => r.rule_type === "DO"),
    DONT: rules.filter((r) => r.rule_type === "DONT"),
    STOP: rules.filter((r) => r.rule_type === "STOP"),
    REDIRECT: rules.filter((r) => r.rule_type === "REDIRECT"),
  };

  const activeRulesCount = rules.filter((r) => r.is_active).length;

  return {
    rules,
    rulesByType,
    isLoading,
    activeRulesCount,
    createRule: createRule.mutateAsync,
    updateRule: updateRule.mutateAsync,
    deleteRule: deleteRule.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    isCreating: createRule.isPending,
    isUpdating: updateRule.isPending,
  };
}
