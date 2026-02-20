import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Common email webhook payload structures
interface EmailWebhookPayload {
  // Standard fields - adapt based on your service
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body?: string;
  html?: string;
  text?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
  // Metadata
  timestamp?: string;
  workspaceId?: string;
  // For services like Mailgun, SendGrid, etc.
  sender?: string;
  recipient?: string;
  "stripped-text"?: string;
  "stripped-html"?: string;
  "Message-Id"?: string;
  "In-Reply-To"?: string;
  References?: string;
}

function parseEmailAddress(input: string): { name: string; email: string } {
  const cleaned = input.trim();
  
  // Format: "Name" <email@domain.com> or Name <email@domain.com>
  const withBracketsMatch = cleaned.match(/^(?:"?([^"<]*)"?\s*)?<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/);
  if (withBracketsMatch && withBracketsMatch[2]) {
    const email = withBracketsMatch[2].toLowerCase().trim();
    const name = withBracketsMatch[1]?.trim() || email.split("@")[0];
    return { name, email };
  }
  
  // Simple format: email@domain.com (no brackets)
  const simpleEmailMatch = cleaned.match(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (simpleEmailMatch) {
    const email = simpleEmailMatch[1].toLowerCase().trim();
    return { name: email.split("@")[0], email };
  }
  
  // Fallback - try to extract any email-like pattern from the string
  const anyEmailMatch = cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (anyEmailMatch) {
    const email = anyEmailMatch[1].toLowerCase().trim();
    const namePart = cleaned.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
    return { name: namePart || email.split("@")[0], email };
  }
  
  console.warn("Could not parse email address:", input);
  return { name: cleaned, email: cleaned.toLowerCase() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("EMAIL_WEBHOOK_SECRET");
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook secret if configured
    const providedSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse payload - support both JSON and form data
    let payload: EmailWebhookPayload;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries()) as unknown as EmailWebhookPayload;
    } else {
      throw new Error("Unsupported content type");
    }

    console.log("Received email webhook:", JSON.stringify(payload, null, 2));

    // Normalize payload fields (different services use different field names)
    const from = payload.from || payload.sender || "";
    const to = payload.to || payload.recipient || "";
    const subject = payload.subject || "(Sem assunto)";
    const body = payload.text || payload["stripped-text"] || payload.body || "";
    const html = payload.html || payload["stripped-html"] || "";
    const messageId = payload.messageId || payload["Message-Id"] || `<${crypto.randomUUID()}@webhook>`;
    const inReplyTo = payload.inReplyTo || payload["In-Reply-To"] || null;
    const references = payload.references || (payload.References ? payload.References.split(/\s+/) : []);

    if (!from || !to) {
      throw new Error("Missing required fields: from and to");
    }

    const senderInfo = parseEmailAddress(from);
    const recipientInfo = parseEmailAddress(to);

    // Find workspace by recipient email (email connection)
    const { data: emailConnection } = await supabaseClient
      .from("email_connections")
      .select("workspace_id, id")
      .eq("email_address", recipientInfo.email)
      .eq("is_active", true)
      .maybeSingle();

    // Also try with workspaceId from payload
    let workspaceId = emailConnection?.workspace_id || payload.workspaceId;
    
    if (!workspaceId) {
      console.error("No workspace found for recipient:", recipientInfo.email);
      return new Response(
        JSON.stringify({ error: "Workspace not found", recipient: recipientInfo.email }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create lead by email
    let { data: lead } = await supabaseClient
      .from("leads")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("external_email", senderInfo.email)
      .maybeSingle();

    if (!lead) {
      // Create new lead
      const { data: newLead, error: leadError } = await supabaseClient
        .from("leads")
        .insert({
          workspace_id: workspaceId,
          name: senderInfo.name || senderInfo.email,
          external_email: senderInfo.email,
          source: "email",
          status: "new",
          created_by: "00000000-0000-0000-0000-000000000000", // System user
        })
        .select()
        .single();

      if (leadError || !newLead) {
        console.error("Error creating lead:", leadError);
        throw new Error("Failed to create lead");
      }
      lead = newLead;
    }

    // At this point lead is guaranteed to exist
    const leadId = lead!.id;

    // Find existing conversation by email threading or create new
    let conversation;
    
    if (inReplyTo) {
      // Try to find conversation by In-Reply-To header
      const { data: existingMessage } = await supabaseClient
        .from("messages")
        .select("conversation_id")
        .eq("workspace_id", workspaceId)
        .eq("email_message_id", inReplyTo)
        .maybeSingle();

      if (existingMessage) {
        const { data: existingConv } = await supabaseClient
          .from("conversations")
          .select("*")
          .eq("id", existingMessage.conversation_id)
          .single();
        conversation = existingConv;
      }
    }

    if (!conversation) {
      // Try to find by lead and recent timeframe
      const { data: recentConv } = await supabaseClient
        .from("conversations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .eq("channel", "email")
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentConv) {
        conversation = recentConv;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabaseClient
          .from("conversations")
          .insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            channel: "email",
            status: "open",
            unread_count: 1,
            last_message_at: new Date().toISOString(),
            channel_metadata: {
              subject,
              from_email: senderInfo.email,
              to_email: recipientInfo.email,
            },
          })
          .select()
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
          throw new Error("Failed to create conversation");
        }
        conversation = newConv;
      }
    }

    // Create message
    const { data: message, error: msgError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        workspace_id: workspaceId,
        direction: "inbound",
        content: body || html || "(Conteúdo vazio)",
        sent_at: payload.timestamp || new Date().toISOString(),
        email_message_id: messageId,
        email_in_reply_to: inReplyTo,
        email_references: references.length > 0 ? references : null,
        email_subject: subject,
        attachments: payload.attachments ? payload.attachments as unknown as Record<string, never>[] : null,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Error creating message:", msgError);
      throw new Error("Failed to create message");
    }

    // Update conversation
    await supabaseClient
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
      })
      .eq("id", conversation.id);

    // Log activity
    await supabaseClient
      .from("crm_activities")
      .insert({
        workspace_id: workspaceId,
        entity_type: "conversation",
        entity_id: conversation.id,
        conversation_id: conversation.id,
        lead_id: leadId,
        activity_type: "email_received",
        title: `Email recebido: ${subject}`,
        description: `De: ${senderInfo.name} <${senderInfo.email}>`,
        metadata: {
          message_id: messageId,
          from: from,
          subject,
        },
      });

    // Fire-and-forget: compute conversation signals for the lead
    (async () => {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-conversation-signals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId, lead_id: leadId }),
        });
      } catch { /* silent */ }
    })();

    console.log("Email processed successfully:", {
      conversationId: conversation.id,
      messageId: message.id,
      leadId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        messageId: message.id,
        leadId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
