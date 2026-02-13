import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface NormalizedMessage {
  workspace_id: string;
  channel: string;
  sender_id: string;
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  content: string;
  attachments?: any[] | null;
  external_thread_id: string;
  external_message_id?: string;
  timestamp: string;
  channel_metadata?: Record<string, unknown>;
  // Optional: for channels that manage leads
  lead_id?: string;
  contact_id?: string;
}

export interface NormalizeResult {
  conversation_id: string;
  message_id: string;
  is_new_conversation: boolean;
  is_duplicate: boolean;
}

/**
 * Shared normalization layer for all incoming webhook messages.
 * Handles deduplication, find-or-create conversation, message insert, and conversation update.
 */
export async function normalizeIncomingMessage(
  supabase: SupabaseClient,
  msg: NormalizedMessage
): Promise<NormalizeResult> {
  // 1. Deduplication: check if message already exists by external_message_id
  if (msg.external_message_id) {
    const { data: existing } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .eq("workspace_id", msg.workspace_id)
      .eq("external_message_id", msg.external_message_id)
      .maybeSingle();

    if (existing) {
      console.log("[normalize] Duplicate message skipped:", msg.external_message_id);
      return {
        conversation_id: existing.conversation_id,
        message_id: existing.id,
        is_new_conversation: false,
        is_duplicate: true,
      };
    }
  }

  // 2. Find or create conversation by external_thread_id
  let conversationId: string;
  let isNewConversation = false;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", msg.workspace_id)
    .eq("external_thread_id", msg.external_thread_id)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    // Try by lead_id + channel if provided
    if (msg.lead_id) {
      const { data: leadConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", msg.workspace_id)
        .eq("lead_id", msg.lead_id)
        .eq("channel", msg.channel)
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leadConv) {
        conversationId = leadConv.id;
      }
    }
  }

  // Create new conversation if none found
  if (!conversationId!) {
    const messagePreview = msg.content.substring(0, 100);
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: msg.workspace_id,
        channel: msg.channel,
        external_thread_id: msg.external_thread_id,
        status: "open",
        unread_count: 1,
        last_message_at: msg.timestamp,
        last_message_preview: messagePreview,
        lead_id: msg.lead_id || null,
        contact_id: msg.contact_id || null,
        channel_metadata: msg.channel_metadata || null,
      })
      .select("id")
      .single();

    if (convError) {
      console.error("[normalize] Failed to create conversation:", convError);
      throw new Error("Failed to create conversation");
    }
    conversationId = newConv.id;
    isNewConversation = true;
  }

  // 3. Insert message
  const { data: newMessage, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      workspace_id: msg.workspace_id,
      direction: "inbound",
      content: msg.content,
      attachments: msg.attachments && msg.attachments.length > 0 ? msg.attachments : null,
      sent_at: msg.timestamp,
      external_message_id: msg.external_message_id || null,
    })
    .select("id")
    .single();

  if (msgError) {
    console.error("[normalize] Failed to save message:", msgError);
    throw new Error("Failed to save message");
  }

  // 4. Update conversation (if not new — new already has correct values)
  if (!isNewConversation) {
    const messagePreview = msg.content.substring(0, 100);
    await supabase
      .from("conversations")
      .update({
        last_message_at: msg.timestamp,
        last_message_preview: messagePreview,
        status: "open",
      })
      .eq("id", conversationId);
  }

  return {
    conversation_id: conversationId,
    message_id: newMessage.id,
    is_new_conversation: isNewConversation,
    is_duplicate: false,
  };
}
