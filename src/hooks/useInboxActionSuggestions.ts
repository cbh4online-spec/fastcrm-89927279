import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/hooks/useMessages";

export type ActionType = 
  | "reply_now" 
  | "create_opportunity" 
  | "send_proposal" 
  | "schedule_followup" 
  | "assign_conversation";

export interface ActionSuggestion {
  action: ActionType;
  reason: string;
  priority: "high" | "medium" | "low";
  context?: string | null;
}

interface UseInboxActionSuggestionsProps {
  conversationId: string | null;
  messages: Message[] | undefined;
  leadData?: {
    name?: string;
    status?: string;
    source?: string;
    tags?: string[];
  };
  opportunityData?: {
    title?: string;
    value?: number;
    stage?: string;
    status?: string;
  };
  proposalData?: {
    count: number;
    hasAccepted: boolean;
    hasPending: boolean;
  };
  conversationData?: {
    channel: string;
    status: string;
    assignedTo?: string;
    hoursSinceLastMessage?: number;
    temperature?: number;
  };
}

export function useInboxActionSuggestions({
  conversationId,
  messages,
  leadData,
  opportunityData,
  proposalData,
  conversationData,
}: UseInboxActionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ActionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastMessageCountRef = useRef<number>(0);
  const lastConversationIdRef = useRef<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!conversationId || !messages || messages.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedMessages = messages.map((m) => ({
        direction: m.direction,
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-inbox-actions",
        {
          body: {
            messages: formattedMessages,
            leadData,
            opportunityData,
            proposalData,
            conversationData,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuggestions(data?.suggestions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao obter sugestões";
      setError(message);
      console.error("Action suggestions error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, leadData, opportunityData, proposalData, conversationData]);

  // Auto-fetch on conversation change or new messages
  useEffect(() => {
    const messageCount = messages?.length || 0;
    const conversationChanged = conversationId !== lastConversationIdRef.current;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

    if (conversationId && messages && messages.length > 0) {
      if (conversationChanged || hasNewMessages) {
        lastConversationIdRef.current = conversationId;
        lastMessageCountRef.current = messageCount;
        fetchSuggestions();
      }
    } else {
      setSuggestions([]);
    }
  }, [conversationId, messages?.length, fetchSuggestions]);

  const refresh = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh,
  };
}
