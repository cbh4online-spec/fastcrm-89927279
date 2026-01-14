import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConversationPriority = "high" | "medium" | "low";
export type ConversationIntent = "support" | "sales" | "question" | "follow_up" | "complaint" | "other";
export type ConversationSentiment = "positive" | "neutral" | "negative";

export interface ConversationClassification {
  priority: ConversationPriority;
  intent: ConversationIntent;
  sentiment: ConversationSentiment;
  reasoning: string;
}

export interface Message {
  direction: string;
  content: string;
}

export function useClassifyConversation() {
  return useMutation({
    mutationFn: async ({
      messages,
      leadName,
      channel,
    }: {
      messages: Message[];
      leadName?: string;
      channel?: string;
    }): Promise<ConversationClassification> => {
      const { data, error } = await supabase.functions.invoke("classify-conversation", {
        body: { messages, leadName, channel },
      });

      if (error) {
        throw new Error(error.message || "Failed to classify conversation");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as ConversationClassification;
    },
    onError: (error) => {
      if (error.message.includes("Rate limit")) {
        toast.error("Limite de pedidos excedido. Tente novamente mais tarde.");
      } else if (error.message.includes("Payment required")) {
        toast.error("Créditos insuficientes. Adicione créditos para continuar.");
      } else {
        toast.error("Erro ao classificar conversa");
      }
    },
  });
}

export function useSaveClassification() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      conversationId,
      classification,
      isAI = true,
    }: {
      conversationId: string;
      classification: Partial<ConversationClassification>;
      isAI?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};

      if (isAI) {
        if (classification.priority) updates.ai_priority = classification.priority;
        if (classification.intent) updates.ai_intent = classification.intent;
        if (classification.sentiment) updates.ai_sentiment = classification.sentiment;
        updates.ai_classification_at = new Date().toISOString();
      } else {
        if (classification.priority) updates.user_priority = classification.priority;
        if (classification.intent) updates.user_intent = classification.intent;
      }

      const { data, error } = await workspaceClient
        .from("conversations")
        .update(updates)
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

export function useConfirmClassification() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      updateLead = true,
    }: {
      conversationId: string;
      leadId?: string | null;
      updateLead?: boolean;
    }) => {
      // First get the conversation to get its classification
      const { data: conversation, error: fetchError } = await workspaceClient
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (fetchError) throw fetchError;

      // Mark classification as confirmed
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({
          classification_confirmed: true,
          classification_confirmed_at: new Date().toISOString(),
          classification_confirmed_by: user?.id,
        })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;

      // Update lead status based on classification if requested
      if (updateLead && leadId) {
        const effectivePriority = conversation.user_priority || conversation.ai_priority;
        const effectiveIntent = conversation.user_intent || conversation.ai_intent;

        // Add tags based on classification
        const newTags: string[] = [];
        if (effectivePriority === "high") newTags.push("prioridade-alta");
        if (effectiveIntent === "sales") newTags.push("potencial-venda");
        if (effectiveIntent === "support") newTags.push("suporte");
        if (effectiveIntent === "complaint") newTags.push("reclamacao");

        if (newTags.length > 0) {
          // Get existing tags
          const { data: lead } = await workspaceClient
            .from("leads")
            .select("tags")
            .eq("id", leadId)
            .single();

          const existingTags = (lead?.tags as string[]) || [];
          const mergedTags = [...new Set([...existingTags, ...newTags])];

          await workspaceClient
            .from("leads")
            .update({ tags: mergedTags })
            .eq("id", leadId);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Classificação confirmada e aplicada ao CRM");
    },
    onError: () => {
      toast.error("Erro ao confirmar classificação");
    },
  });
}
