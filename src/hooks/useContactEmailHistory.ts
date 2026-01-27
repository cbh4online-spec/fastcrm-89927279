import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Message, MessageDirection, MessageAttachment } from "@/hooks/useMessages";

export interface EmailConversationWithMessages {
  id: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  channel_metadata: Record<string, unknown> | null;
  messages: Message[];
}

/**
 * Hook to fetch email history for a contact/lead/company
 * Fetches all conversations and their messages associated with the entity
 */
export function useContactEmailHistory(
  entityType: 'contact' | 'lead' | 'company',
  entityId: string | undefined
) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["email-history", entityType, entityId],
    queryFn: async () => {
      if (!entityId || !currentWorkspace) return [];

      // Build the filter based on entity type
      let filter = "";
      switch (entityType) {
        case "contact":
          filter = `contact_id.eq.${entityId}`;
          break;
        case "lead":
          filter = `lead_id.eq.${entityId}`;
          break;
        case "company":
          filter = `company_id.eq.${entityId}`;
          break;
      }

      // Fetch conversations with messages
      const { data: conversations, error } = await workspaceClient
        .from("conversations")
        .select(`
          id,
          status,
          last_message_at,
          last_message_preview,
          channel_metadata,
          messages (
            id,
            conversation_id,
            workspace_id,
            direction,
            content,
            attachments,
            sender_id,
            sent_at,
            delivered_at,
            read_at,
            created_at,
            email_subject,
            email_message_id,
            email_in_reply_to
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .eq("channel", "email")
        .or(filter)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Transform and sort messages
      return (conversations || []).map((conv) => ({
        id: conv.id,
        status: conv.status,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        channel_metadata: conv.channel_metadata as Record<string, unknown> | null,
        messages: ((conv.messages as any[]) || [])
          .map((msg) => ({
            ...msg,
            direction: msg.direction as MessageDirection,
            attachments: (msg.attachments || []) as MessageAttachment[],
          }))
          .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
      })) as EmailConversationWithMessages[];
    },
    enabled: !!entityId && !!currentWorkspace,
  });
}

/**
 * Hook to fetch email history by email address
 * Useful when we don't have an entity ID yet
 */
export function useEmailHistoryByAddress(email: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["email-history-by-address", email],
    queryFn: async () => {
      if (!email || !currentWorkspace) return [];

      // Fetch conversations where channel_metadata contains this email
      const { data: conversations, error } = await workspaceClient
        .from("conversations")
        .select(`
          id,
          status,
          last_message_at,
          last_message_preview,
          channel_metadata,
          messages (
            id,
            conversation_id,
            workspace_id,
            direction,
            content,
            attachments,
            sender_id,
            sent_at,
            delivered_at,
            read_at,
            created_at,
            email_subject,
            email_message_id,
            email_in_reply_to
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .eq("channel", "email")
        .or(`channel_metadata->>email.eq.${email},channel_metadata->>from_email.eq.${email}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      return (conversations || []).map((conv) => ({
        id: conv.id,
        status: conv.status,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        channel_metadata: conv.channel_metadata as Record<string, unknown> | null,
        messages: ((conv.messages as any[]) || [])
          .map((msg) => ({
            ...msg,
            direction: msg.direction as MessageDirection,
            attachments: (msg.attachments || []) as MessageAttachment[],
          }))
          .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
      })) as EmailConversationWithMessages[];
    },
    enabled: !!email && !!currentWorkspace,
  });
}
