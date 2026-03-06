import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export type EntityType = "lead" | "opportunity" | "contact" | "company";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "expired";

export interface FieldSuggestion {
  id: string;
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string;
  field_name: string;
  field_type: "standard" | "custom";
  custom_field_id: string | null;
  suggested_value: unknown;
  confidence: number;
  explanation: string;
  status: SuggestionStatus;
  source_context: Record<string, unknown> | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface GenerateSuggestionsResult {
  suggestions: Array<{
    fieldName: string;
    fieldType: "standard" | "custom";
    customFieldId?: string;
    suggestedValue: unknown;
    confidence: number;
    explanation: string;
  }>;
  context: {
    hasConversations: boolean;
    customFieldsAnalyzed: number;
  };
}

export function useFieldSuggestions(entityType: EntityType, entityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["field-suggestions", entityType, entityId],
    queryFn: async (): Promise<FieldSuggestion[]> => {
      if (!entityId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("ai_field_suggestions")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "pending")
        .order("confidence", { ascending: false });

      if (error) {
        console.error('[AI-SUGGESTIONS] Failed to fetch field suggestions:', error.message);
        throw error;
      }
      
      return (data || []) as unknown as FieldSuggestion[];
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });
}

export function useGenerateFieldSuggestions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId 
    }: { 
      entityType: EntityType; 
      entityId: string;
    }): Promise<GenerateSuggestionsResult> => {
      if (!currentWorkspace?.id) throw new Error("Workspace not found");

      const { data, error } = await supabase.functions.invoke("ai-field-suggestions", {
        body: {
          entityType,
          entityId,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("credits")) {
          toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
        }
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["field-suggestions", variables.entityType, variables.entityId] 
      });
      const count = data.suggestions?.length ?? 0;
      console.log(`[AI-SUGGESTIONS] Field suggestions generated for ${variables.entityType}:${variables.entityId} — ${count} suggestions`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.CREATED',
          entity_kind: variables.entityType,
          entity_id: variables.entityId,
          source_module: 'ai-suggestions',
          payload: { suggestion_count: count },
        });
      }
    },
    onError: (error: Error) => {
      console.error('[AI-SUGGESTIONS] Field suggestions generation failed:', error.message);
    },
  });
}

export function useAcceptSuggestion() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      suggestion,
      onApply,
    }: { 
      suggestion: FieldSuggestion;
      onApply: (fieldName: string, value: unknown, fieldType: "standard" | "custom", customFieldId?: string) => Promise<void>;
    }) => {
      await onApply(
        suggestion.field_name, 
        suggestion.suggested_value, 
        suggestion.field_type,
        suggestion.custom_field_id || undefined
      );

      const { error } = await supabase
        .from("ai_field_suggestions")
        .update({ 
          status: "accepted",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestion.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["field-suggestions", variables.suggestion.entity_type, variables.suggestion.entity_id] 
      });
      toast.success("Sugestão aplicada com sucesso");
      console.log(`[AI-SUGGESTIONS] Field suggestion accepted: ${variables.suggestion.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.ACCEPTED',
          entity_kind: variables.suggestion.entity_type,
          entity_id: variables.suggestion.entity_id,
          source_module: 'ai-suggestions',
          payload: { field_name: variables.suggestion.field_name, field_type: variables.suggestion.field_type, confidence: variables.suggestion.confidence },
        });
      }
    },
    onError: (error: Error) => {
      console.error('[AI-SUGGESTIONS] Field suggestion accept failed:', error.message);
      toast.error("Erro ao aplicar sugestão");
    },
  });
}

export function useRejectSuggestion() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion: FieldSuggestion) => {
      const { error } = await supabase
        .from("ai_field_suggestions")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestion.id);

      if (error) throw error;
    },
    onSuccess: (_, suggestion) => {
      queryClient.invalidateQueries({ 
        queryKey: ["field-suggestions", suggestion.entity_type, suggestion.entity_id] 
      });
      console.log(`[AI-SUGGESTIONS] Field suggestion rejected: ${suggestion.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'SUGGESTION.REJECTED',
          entity_kind: suggestion.entity_type,
          entity_id: suggestion.entity_id,
          source_module: 'ai-suggestions',
        });
      }
    },
    onError: (error: Error) => {
      console.error('[AI-SUGGESTIONS] Field suggestion reject failed:', error.message);
    },
  });
}

export function useDismissAllSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId 
    }: { 
      entityType: EntityType; 
      entityId: string;
    }) => {
      const { error } = await supabase
        .from("ai_field_suggestions")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["field-suggestions", variables.entityType, variables.entityId] 
      });
      console.log(`[AI-SUGGESTIONS] All field suggestions dismissed for ${variables.entityType}:${variables.entityId}`);
    },
  });
}
