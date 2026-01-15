import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { Message } from "./useMessages";

export const AVAILABLE_TAGS = [
  "Lead",
  "Cliente", 
  "Oportunidade Aberta",
  "Suporte",
  "Financeiro",
  "Alta Intenção",
  "Baixa Prioridade",
  "Negociação",
  "Proposta Enviada",
  "Reclamação",
  "Parceria",
  "Indicação",
] as const;

export type ConversationTag = typeof AVAILABLE_TAGS[number];

export interface TagResult {
  tags: ConversationTag[];
  reasoning: string;
  autoAssigned: boolean;
}

export interface ConversationTagContext {
  channel: string;
  leadStatus?: string;
  hasOpportunity: boolean;
  opportunityValue?: number;
  aiIntent?: string;
  aiPriority?: string;
  aiSentiment?: string;
}

export function useAutoTags() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTags = useCallback(
    async (
      messages: Message[],
      context: ConversationTagContext,
      conversationId?: string
    ): Promise<TagResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const formattedMessages = messages.map((m) => ({
          direction: m.direction,
          content: m.content,
        }));

        const { data, error: fnError } = await supabase.functions.invoke("ai-auto-tags", {
          body: { messages: formattedMessages, context, conversationId },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.error) {
          if (data.error.includes("Rate limit")) {
            toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
          } else if (data.error.includes("credits")) {
            toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
          }
          setError(data.error);
          return null;
        }

        return data as TagResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao gerar tags";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generateTags, isLoading, error };
}

// Hook to update conversation tags manually
export function useUpdateConversationTags() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      conversationId,
      tags,
      isUserOverride = false,
    }: {
      conversationId: string;
      tags: string[];
      isUserOverride?: boolean;
    }) => {
      const updateData = isUserOverride
        ? { user_tags: tags }
        : { ai_tags: tags, tags_auto_assigned: true, tags_assigned_at: new Date().toISOString() };

      const { data, error } = await workspaceClient
        .from("conversations")
        .update(updateData)
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
    },
  });
}
