import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CopilotAction = 
  | "classify_intent"
  | "extract_contact"
  | "suggest_reply"
  | "summarize_conversation"
  | "suggest_next_actions";

export interface IntentClassification {
  intent: "sales" | "support" | "question";
  confidence: number;
  reasoning: string;
  subIntent?: string;
}

export interface ExtractedContact {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
  confidence: number;
}

export interface ReplySuggestion {
  text: string;
  tone: "formal" | "friendly" | "empathetic" | "professional";
  intent: string;
}

export interface ConversationSummary {
  summary: string;
  mainTopic: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
  status?: string;
  pendingActions?: string[];
}

export interface ActionSuggestion {
  action: string;
  priority: "high" | "medium" | "low";
  category: "call" | "email" | "meeting" | "task" | "follow_up" | "update";
  timeframe?: string;
  reasoning?: string;
}

interface CopilotMessage {
  role: string;
  content: string;
  direction?: string;
}

export function useCopilot() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callCopilot = useCallback(async <T>(
    action: CopilotAction,
    payload: {
      messages?: CopilotMessage[];
      leadData?: Record<string, unknown>;
      conversationContext?: string;
    }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-copilot", {
        body: { action, ...payload },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("credits")) {
          toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      return data?.result as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao chamar AI Copilot";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const classifyIntent = useCallback(
    (messages: CopilotMessage[]) => 
      callCopilot<IntentClassification>("classify_intent", { messages }),
    [callCopilot]
  );

  const extractContact = useCallback(
    (messages: CopilotMessage[]) =>
      callCopilot<ExtractedContact>("extract_contact", { messages }),
    [callCopilot]
  );

  const suggestReplies = useCallback(
    (messages: CopilotMessage[]) =>
      callCopilot<{ suggestions: ReplySuggestion[] }>("suggest_reply", { messages }),
    [callCopilot]
  );

  const summarizeConversation = useCallback(
    (messages: CopilotMessage[]) =>
      callCopilot<ConversationSummary>("summarize_conversation", { messages }),
    [callCopilot]
  );

  const suggestNextActions = useCallback(
    (leadData: Record<string, unknown>, conversationContext?: string) =>
      callCopilot<{ actions: ActionSuggestion[] }>("suggest_next_actions", { 
        leadData, 
        conversationContext 
      }),
    [callCopilot]
  );

  return {
    isLoading,
    error,
    classifyIntent,
    extractContact,
    suggestReplies,
    summarizeConversation,
    suggestNextActions,
  };
}
