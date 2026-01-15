import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/hooks/useMessages";

export interface ConversationSummary {
  bulletPoints: string[];
  status: string;
  lastAction: string;
}

interface UseConversationSummaryProps {
  conversationId: string | null;
  messages: Message[] | undefined;
  leadName?: string;
  channel?: string;
  lastMessageAt?: string;
}

export function useConversationSummary({
  conversationId,
  messages,
  leadName,
  channel,
  lastMessageAt,
}: UseConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track last message count to detect new messages
  const lastMessageCountRef = useRef<number>(0);
  const lastConversationIdRef = useRef<string | null>(null);

  const generateSummary = useCallback(async () => {
    if (!conversationId || !messages || messages.length === 0) {
      setSummary(null);
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
        "conversation-summary",
        {
          body: {
            messages: formattedMessages,
            leadName,
            channel,
            lastMessageAt,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSummary(data as ConversationSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar resumo";
      setError(message);
      console.error("Summary generation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, leadName, channel, lastMessageAt]);

  // Auto-generate summary when messages change
  useEffect(() => {
    const messageCount = messages?.length || 0;
    const conversationChanged = conversationId !== lastConversationIdRef.current;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

    // Generate summary on conversation change or new messages
    if (conversationId && messages && messages.length > 0) {
      if (conversationChanged || hasNewMessages) {
        lastConversationIdRef.current = conversationId;
        lastMessageCountRef.current = messageCount;
        generateSummary();
      }
    } else {
      setSummary(null);
    }
  }, [conversationId, messages?.length, generateSummary]);

  const refresh = useCallback(() => {
    generateSummary();
  }, [generateSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh,
  };
}
