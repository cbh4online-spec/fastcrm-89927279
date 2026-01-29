import { supabase } from "@/integrations/supabase/client";

/**
 * Find a lead by a specific field or create one if not found
 * Uses raw SQL-like approach to avoid TypeScript type instantiation depth issues
 */
export async function findOrCreateLeadByField(
  workspaceId: string,
  fieldName: string,
  fieldValue: string,
  leadData: {
    name: string;
    source: string;
    status: string;
    created_by?: string;
    phone?: string;
    email?: string;
    external_username?: string;
  }
): Promise<string> {
  // Use RPC or direct query - wrap in any to avoid type issues
  const client = supabase as any;
  
  // Query for existing lead
  const { data: existingLeads } = await client
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq(fieldName, fieldValue)
    .limit(1);

  if (existingLeads && existingLeads.length > 0) {
    return existingLeads[0].id;
  }

  // Create new lead
  const { data: newLead, error } = await client
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      ...leadData,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!newLead) throw new Error("Failed to create lead");
  
  return newLead.id;
}

/**
 * Find a conversation by lead and channel or create one if not found
 */
export async function findOrCreateConversation(
  workspaceId: string,
  leadId: string,
  channel: string,
  channelMetadata?: Record<string, unknown>
): Promise<string> {
  const client = supabase as any;
  
  // Query for existing conversation
  const { data: existingConversations } = await client
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("channel", channel)
    .limit(1);

  if (existingConversations && existingConversations.length > 0) {
    return existingConversations[0].id;
  }

  // Create new conversation
  const { data: newConversation, error } = await client
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      channel,
      status: "open",
      channel_metadata: channelMetadata,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!newConversation) throw new Error("Failed to create conversation");

  return newConversation.id;
}

/**
 * Create an outbound message record
 */
export async function createOutboundMessage(
  workspaceId: string,
  conversationId: string,
  content: string
): Promise<void> {
  const client = supabase as any;
  
  await client.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    content,
    direction: "outbound",
    sent_at: new Date().toISOString(),
  });
}
