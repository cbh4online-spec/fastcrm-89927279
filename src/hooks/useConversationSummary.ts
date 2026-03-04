import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/hooks/useMessages";
import { generateRequestId } from "@/lib/requestId";

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
  workspaceId?: string;
}

export function useConversationSummary({
  conversationId,
  messages,
  leadName,
  channel,
  lastMessageAt,
  workspaceId,
}: UseConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastMessageCountRef = useRef<number>(0);
  const lastConversationIdRef = useRef<string | null>(null);

  const generateSummary = useCallback(async () => {
    if (!conversationId || !messages || messages.length === 0) {
      setSummary(null);
      return;
    }

    const correlationId = generateRequestId();
    console.log(`[CONV-SUMMARY] correlation_id=${correlationId} generating summary for ${conversationId}`);

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
      console.log(`[CONV-SUMMARY] correlation_id=${correlationId} summary generated successfully`);

      // Emit CONVERSATION.SUMMARIZED kernel event
      if (workspaceId) {
        import("@/lib/kernelEmitter").then(({ emitKernelEvent }) => {
          emitKernelEvent({
            workspace_id: workspaceId,
            type: 'CONVERSATION.SUMMARIZED',
            entity_kind: 'conversation',
            entity_id: conversationId,
            payload: {
              bullet_count: data.bulletPoints?.length || 0,
              status: data.status,
              last_action: data.lastAction,
            },
            source_module: 'ai-conversational',
            correlation_id: correlationId,
          });
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar resumo";
      setError(message);
      console.error(`[CONV-SUMMARY] correlation_id=${correlationId} error:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, leadName, channel, lastMessageAt, workspaceId]);

  // Auto-generate summary when messages change
  useEffect(() => {
    const messageCount = messages?.length || 0;
    const conversationChanged = conversationId !== lastConversationIdRef.current;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

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
