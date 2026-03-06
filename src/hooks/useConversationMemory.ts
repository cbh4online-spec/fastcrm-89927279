import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  timestamp: Date;
  type?: "brief" | "text";
  actions?: any[];
  items?: any[];
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useConversationMemory() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;
  const conversationIdRef = useRef<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [restoredMessages, setRestoredMessages] = useState<ChatMessage[]>([]);
  const [restoredContext, setRestoredContext] = useState<Record<string, any>>({});

  // Restore last active conversation on mount
  useEffect(() => {
    if (!workspaceId || !userId || restored) return;

    const restore = async () => {
      try {
        const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
        const { data } = await supabase
          .from("command_conversations")
          .select("id, messages, context, last_message_at")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .gt("last_message_at", cutoff)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          conversationIdRef.current = data.id;
          const msgs = (data.messages as any[] || []).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setRestoredMessages(msgs);
          setRestoredContext((data.context as Record<string, any>) || {});
        }
      } catch {
        // No active conversation — that's fine
      }
      setRestored(true);
    };

    restore();
  }, [workspaceId, userId, restored]);

  const persist = useCallback(
    async (messages: ChatMessage[], context: Record<string, any>) => {
      if (!workspaceId || !userId || messages.length === 0) return;

      const serializable = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        type: m.type,
        suggestions: m.suggestions,
      }));

      try {
        if (conversationIdRef.current) {
          await supabase
            .from("command_conversations")
            .update({
              messages: serializable as any,
              context: context as any,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conversationIdRef.current);
        } else {
          const { data } = await supabase
            .from("command_conversations")
            .insert({
              workspace_id: workspaceId,
              user_id: userId,
              messages: serializable as any,
              context: context as any,
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (data) conversationIdRef.current = data.id;
        }
      } catch (e) {
        console.warn("[ConversationMemory] persist failed:", e);
      }
    },
    [workspaceId, userId]
  );

  const startNewConversation = useCallback(() => {
    conversationIdRef.current = null;
    setRestoredMessages([]);
    setRestoredContext({});
  }, []);

  return {
    restored,
    restoredMessages,
    restoredContext,
    persist,
    startNewConversation,
  };
}
