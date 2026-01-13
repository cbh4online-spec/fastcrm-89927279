import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type MessageDirection = "inbound" | "outbound";

export interface MessageAttachment {
  type: "image" | "file" | "audio" | "video";
  url: string;
  name?: string;
  size?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  workspace_id: string;
  direction: MessageDirection;
  content: string;
  attachments: MessageAttachment[];
  sender_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export function useMessages(conversationId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !currentWorkspace) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("workspace_id", currentWorkspace.id)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Message type
      return (data || []).map((msg) => ({
        ...msg,
        direction: msg.direction as MessageDirection,
        attachments: (msg.attachments || []) as unknown as MessageAttachment[],
      })) as Message[];
    },
    enabled: !!conversationId && !!currentWorkspace,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId || !currentWorkspace) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentWorkspace, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachments = [],
    }: {
      conversationId: string;
      content: string;
      attachments?: MessageAttachment[];
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as const,
          content,
          attachments: attachments as unknown as any,
          sender_id: user.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return {
        ...message,
        direction: message.direction as MessageDirection,
        attachments: (message.attachments || []) as unknown as MessageAttachment[],
      } as Message;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
    },
  });
}
