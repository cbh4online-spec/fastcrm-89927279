import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface AISuggestion {
  action: string;
  channel: "whatsapp" | "phone" | "email" | "in_person";
  message_draft: string;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  suggestion_id?: string;
  cached?: boolean;
  error?: string;
  fallback?: boolean;
}

export function useLeadChefAISuggestion() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ leadId, forceRefresh }: { leadId: string; forceRefresh?: boolean }): Promise<AISuggestion> => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("leadchef-next-action-ai", {
        body: { workspaceId, leadId, forceRefresh },
      });
      if (error) throw error;
      return data as AISuggestion;
    },
    onSuccess: (data, vars) => {
      if (data.fallback) {
        toast.warning(
          data.error === "credits_exhausted"
            ? "Sem créditos IA. Por favor, adiciona créditos."
            : data.error === "rate_limited"
            ? "Muitos pedidos IA. Tenta novamente daqui a um minuto."
            : "Não foi possível gerar sugestão. Tenta de novo."
        );
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["leadchef", "ai-suggestions", workspaceId, vars.leadId],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro a gerar sugestão");
    },
  });
}

export function useMarkSuggestionUsed() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!workspaceId) return;
      await (supabase as any)
        .from("leadchef_ai_suggestions")
        .update({ used_at: new Date().toISOString() })
        .eq("id", suggestionId)
        .eq("workspace_id", workspaceId);
    },
  });
}
