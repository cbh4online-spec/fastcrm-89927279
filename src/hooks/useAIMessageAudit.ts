import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIMessageAudit {
  id: string;
  workspace_id: string;
  message_id: string | null;
  conversation_id: string;
  bot_id: string | null;
  prompt_used: string | null;
  rag_chunks: Array<{
    chunk_id: string;
    source: string;
    score: number;
    excerpt: string;
  }>;
  intent: {
    label?: string;
    confidence?: number;
  };
  model_meta: {
    model?: string;
    tokens?: number;
    latency_ms?: number | null;
  };
  memory_context: Array<{
    id: string;
    content: string;
    memory_type: string;
    category: string | null;
  }>;
  detected_intent: {
    intent?: string;
    confidence?: number;
  };
  created_at: string;
}

export function useAIMessageAudit(messageId: string | null | undefined) {
  return useQuery({
    queryKey: ["ai-message-audit", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const { data, error } = await supabase
        .from("ai_message_audit")
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();

      if (error) throw error;
      return data as AIMessageAudit | null;
    },
    enabled: !!messageId,
  });
}

export function useAIConversationAudits(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: ["ai-conversation-audits", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("ai_message_audit")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as AIMessageAudit[];
    },
    enabled: !!conversationId,
  });
}
