import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type AssistantAction = "diagnose" | "validate" | "recommend" | "chat" | "create_automation";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AssistantContext {
  hasOpportunity: boolean;
  hasSubscription: boolean;
  eventCount: number;
  automationCount: number;
  metrics?: {
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    pastDueCount: number;
    churnRisk: number;
  };
}

export function useBillingAssistant() {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [context, setContext] = useState<AssistantContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    action: AssistantAction,
    options?: {
      opportunityId?: string;
      subscriptionId?: string;
      userMessage?: string;
    }
  ) => {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não selecionado");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to history if it's a chat action
      if (action === "chat" && options?.userMessage) {
        setMessages(prev => [...prev, {
          role: "user",
          content: options.userMessage!,
          timestamp: new Date()
        }]);
      }

      const { data, error: fnError } = await supabase.functions.invoke("billing-assistant", {
        body: {
          workspaceId: currentWorkspace.id,
          opportunityId: options?.opportunityId,
          subscriptionId: options?.subscriptionId,
          action,
          userMessage: options?.userMessage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant response to history
      const assistantMessage: AssistantMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update context
      if (data.context) {
        setContext(data.context);
      }

      return data.response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao contactar assistente";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, messages]);

  const diagnose = useCallback((opportunityId?: string, subscriptionId?: string) => {
    return sendMessage("diagnose", { opportunityId, subscriptionId });
  }, [sendMessage]);

  const validate = useCallback((opportunityId?: string, subscriptionId?: string) => {
    return sendMessage("validate", { opportunityId, subscriptionId });
  }, [sendMessage]);

  const recommend = useCallback((opportunityId?: string, subscriptionId?: string) => {
    return sendMessage("recommend", { opportunityId, subscriptionId });
  }, [sendMessage]);

  const chat = useCallback((message: string, opportunityId?: string, subscriptionId?: string) => {
    return sendMessage("chat", { userMessage: message, opportunityId, subscriptionId });
  }, [sendMessage]);

  const createAutomation = useCallback((description: string, opportunityId?: string) => {
    return sendMessage("create_automation", { userMessage: description, opportunityId });
  }, [sendMessage]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setContext(null);
    setError(null);
  }, []);

  return {
    isLoading,
    messages,
    context,
    error,
    diagnose,
    validate,
    recommend,
    chat,
    createAutomation,
    clearHistory
  };
}
