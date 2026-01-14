import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decrypt credential
async function decryptCredential(encrypted: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    data
  );
  
  return decoder.decode(decrypted);
}

// Generate Message-ID
function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replace(/-/g, "");
  return `<${timestamp}.${random}@${domain}>`;
}

interface SendEmailRequest {
  connectionId: string;
  workspaceId: string;
  conversationId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("EMAIL_ENCRYPTION_KEY") || supabaseServiceKey.slice(0, 32);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: SendEmailRequest = await req.json();
    const { connectionId, workspaceId, conversationId, to, subject, body: emailBody, inReplyTo, references } = body;

    // Verify workspace membership
    const { data: member } = await supabaseClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!member) {
      throw new Error("Permission denied");
    }

    // Get email connection
    const { data: connection, error: connError } = await supabaseClient
      .from("email_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("Email connection not found");
    }

    // Generate message ID
    const domain = connection.email_address.split("@")[1];
    const messageId = generateMessageId(domain);

    // Build references header for threading
    const allReferences = references ? [...references] : [];
    if (inReplyTo && !allReferences.includes(inReplyTo)) {
      allReferences.push(inReplyTo);
    }

    // Note: In production, you would use an SMTP library here
    // For now, we'll simulate sending and save the message
    console.log(`Would send via SMTP: ${connection.smtp_host}:${connection.smtp_port}`);
    console.log(`From: ${connection.email_address}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`In-Reply-To: ${inReplyTo || "none"}`);

    // Save the sent message
    const { data: message, error: msgError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        direction: "outbound",
        content: emailBody,
        sender_id: user.id,
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        email_message_id: messageId,
        email_in_reply_to: inReplyTo || null,
        email_references: allReferences.length > 0 ? allReferences : null,
        email_subject: subject,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Message save error:", msgError);
      throw new Error("Failed to save message");
    }

    // Update conversation
    await supabaseClient
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Log activity
    await supabaseClient
      .from("crm_activities")
      .insert({
        workspace_id: workspaceId,
        entity_type: "conversation",
        entity_id: conversationId,
        conversation_id: conversationId,
        activity_type: "email_sent",
        title: `Email enviado: ${subject}`,
        description: `Email enviado para ${to}`,
        metadata: {
          message_id: messageId,
          to,
          subject,
          connection_id: connectionId,
        },
        performed_by: user.id,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: message.id,
        emailMessageId: messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
