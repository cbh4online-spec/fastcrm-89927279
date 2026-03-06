import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface AutomationSuggestion {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  confidence: number;
  explanation: string;
  pattern_data: Record<string, unknown> | null;
  detected_pattern_type: string | null;
  status: "pending" | "accepted" | "dismissed" | "expired";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_automation_id: string | null;
}

export function useAutomationSuggestions(limit?: number) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["automation_suggestions", currentWorkspace?.id, limit],
    queryFn: async (): Promise<AutomationSuggestion[]> => {
      if (!currentWorkspace?.id) return [];

      let query = workspaceClient
        .from("automation_suggestions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "pending")
        .gte("confidence", 0.7)
        .order("confidence", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AI-SUGGESTIONS] Failed to fetch automation suggestions:', error.message);
        throw error;
      }
      return (data || []) as unknown as AutomationSuggestion[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useGenerateAutomationSuggestions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data, error } = await supabase.functions.invoke("ai-automation-suggestions", {
        body: { workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("credits")) {
          toast.error("Créditos AI esgotados.");
        }
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation_suggestions", currentWorkspace?.id] });
      const count = data?.suggestions?.length ?? 0;
      console.log(`[AI-SUGGESTIONS] Automation suggestions generated — ${count} suggestions`);
      toast.success("Análise de padrões concluída");
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.GENERATED',
          entity_kind: 'automation_suggestion',
          entity_id: currentWorkspace.id,
          source_module: 'ai-suggestions',
          payload: { count },
        });
      }
    },
    onError: (error) => {
      console.error("[AI-SUGGESTIONS] Automation suggestions generation failed:", error);
      toast.error("Erro ao analisar padrões");
    },
  });
}

export function useAcceptAutomationSuggestion() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await workspaceClient
        .from("automation_suggestions")
        .update({
          status: "accepted",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (error) throw error;
      return suggestionId;
    },
    onSuccess: (suggestionId) => {
      queryClient.invalidateQueries({ queryKey: ["automation_suggestions", currentWorkspace?.id] });
      console.log(`[AI-SUGGESTIONS] Automation suggestion accepted: ${suggestionId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.ACCEPTED',
          entity_kind: 'automation_suggestion',
          entity_id: suggestionId,
          source_module: 'ai-suggestions',
        });
      }
    },
  });
}

export function useDismissAutomationSuggestion() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await workspaceClient
        .from("automation_suggestions")
        .update({
          status: "dismissed",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (error) throw error;
      return suggestionId;
    },
    onSuccess: (suggestionId) => {
      queryClient.invalidateQueries({ queryKey: ["automation_suggestions", currentWorkspace?.id] });
      console.log(`[AI-SUGGESTIONS] Automation suggestion dismissed: ${suggestionId}`);
      toast.success("Sugestão descartada");
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.DISMISSED',
          entity_kind: 'automation_suggestion',
          entity_id: suggestionId,
          source_module: 'ai-suggestions',
        });
      }
    },
  });
}

export function useDismissAllSuggestions() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { error } = await workspaceClient
        .from("automation_suggestions")
        .update({
          status: "dismissed",
          reviewed_at: new Date().toISOString(),
        })
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_suggestions", currentWorkspace?.id] });
      console.log('[AI-SUGGESTIONS] All automation suggestions dismissed');
      toast.success("Todas as sugestões descartadas");
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.ALL_DISMISSED',
          entity_kind: 'automation_suggestion',
          entity_id: currentWorkspace.id,
          source_module: 'ai-suggestions',
        });
      }
    },
  });
}
