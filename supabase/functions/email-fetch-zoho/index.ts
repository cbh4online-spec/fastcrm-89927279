import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zoho API base URL (US/Global region)
const ZOHO_API_BASE = "https://mail.zoho.eu/api";
const ZOHO_AUTH_BASE = "https://accounts.zoho.eu";

interface ZohoEmail {
  messageId: string;
  folderId: string;
  subject: string;
  sender: string;
  toAddress: string;
  receivedTime: number;
  summary: string;
  status: string;
  hasAttachment: boolean;
  fromAddress: string;
}

interface ZohoEmailDetail {
  messageId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  content: string;
  htmlContent?: string;
  receivedTime: number;
  sentDateInGMT: number;
  inReplyTo?: string;
  messageIdHeader?: string;
}

// Get fresh access token using refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("ZOHO_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET");
  const refreshToken = Deno.env.get("ZOHO_REFRESH_TOKEN");

  console.log("OAuth Debug - Client ID exists:", !!clientId, "length:", clientId?.length);
  console.log("OAuth Debug - Client Secret exists:", !!clientSecret, "length:", clientSecret?.length);
  console.log("OAuth Debug - Refresh Token exists:", !!refreshToken, "starts with 1000.:", refreshToken?.startsWith("1000."));

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Zoho OAuth credentials");
  }

  const tokenUrl = `${ZOHO_AUTH_BASE}/oauth/v2/token`;
  console.log("OAuth Debug - Token URL:", tokenUrl);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  console.log("OAuth Debug - Response status:", response.status);
  console.log("OAuth Debug - Response data:", JSON.stringify(data));
  
  if (data.error) {
    console.error("Zoho OAuth error:", data);
    throw new Error(`Zoho OAuth error: ${data.error}`);
  }

  return data.access_token;
}

// Fetch emails from Zoho
async function fetchZohoEmails(accessToken: string, accountId: string, limit = 50): Promise<ZohoEmail[]> {
  const response = await fetch(
    `${ZOHO_API_BASE}/accounts/${accountId}/messages/view?limit=${limit}&sortorder=desc&includeto=true`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  
  if (data.status?.code !== 200 && !data.data) {
    console.error("Zoho API error:", data);
    throw new Error(`Zoho API error: ${JSON.stringify(data)}`);
  }

  return data.data || [];
}

// Fetch full email content
async function fetchEmailContent(
  accessToken: string, 
  accountId: string, 
  messageId: string,
  folderId: string
): Promise<ZohoEmailDetail | null> {
  try {
    const response = await fetch(
      `${ZOHO_API_BASE}/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    
    if (data.status?.code !== 200 && !data.data) {
      console.error("Error fetching email content:", data);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching email content:", error);
    return null;
  }
}

// Parse email address from Zoho format
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
  
  // Fallback - try to extract any email-like pattern
  const anyEmailMatch = cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (anyEmailMatch) {
    const email = anyEmailMatch[1].toLowerCase().trim();
    const namePart = cleaned.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
    return { name: namePart || email.split("@")[0], email };
  }
  
  return { name: cleaned, email: cleaned.toLowerCase() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accountId = Deno.env.get("ZOHO_ACCOUNT_ID");

    if (!accountId) {
      throw new Error("ZOHO_ACCOUNT_ID not configured");
    }

    // Parse request body for workspace ID
    let workspaceId: string | null = null;
    try {
      const body = await req.json();
      workspaceId = body.workspaceId;
    } catch {
      // If no body, we'll try to get it from email connections
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get access token
    console.log("Getting Zoho access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained successfully");

    // Fetch emails from Zoho
    console.log("Fetching emails from Zoho...");
    const emails = await fetchZohoEmails(accessToken, accountId, 50);
    console.log(`Fetched ${emails.length} emails from Zoho`);

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No emails to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace from email connections if not provided
    if (!workspaceId) {
      const { data: connections } = await supabaseClient
        .from("email_connections")
        .select("workspace_id")
        .eq("is_active", true)
        .limit(1);
      
      if (connections && connections.length > 0) {
        workspaceId = connections[0].workspace_id;
      }
    }

    if (!workspaceId) {
      throw new Error("No workspace found for email processing");
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const email of emails) {
      try {
        // Check if message already exists (by external_message_id)
        const { data: existingMessage } = await supabaseClient
          .from("messages")
          .select("id")
          .eq("external_message_id", email.messageId)
          .limit(1);

        if (existingMessage && existingMessage.length > 0) {
          skippedCount++;
          continue; // Skip already processed emails
        }

        // Fetch full email content
        const emailContent = await fetchEmailContent(accessToken, accountId, email.messageId, email.folderId);
        
        const sender = parseEmailAddress(email.fromAddress || email.sender);
        const content = emailContent?.content || email.summary || "";
        const subject = email.subject || "(Sem assunto)";

        // Find or create lead by email
        let leadId: string | null = null;
        const { data: existingLead } = await supabaseClient
          .from("leads")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("external_email", sender.email)
          .limit(1);

        if (existingLead && existingLead.length > 0) {
          leadId = existingLead[0].id;
        } else {
          // Create new lead
          const { data: newLead, error: leadError } = await supabaseClient
            .from("leads")
            .insert({
              workspace_id: workspaceId,
              name: sender.name,
              email: sender.email,
              external_email: sender.email,
              source: "email",
              status: "new",
              created_by: "00000000-0000-0000-0000-000000000000", // System user
            })
            .select("id")
            .single();

          if (leadError) {
            console.error("Error creating lead:", leadError);
          } else {
            leadId = newLead.id;
          }
        }

        // Find or create conversation
        let conversationId: string | null = null;
        const { data: existingConversation } = await supabaseClient
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("lead_id", leadId)
          .eq("channel", "email")
          .limit(1);

        if (existingConversation && existingConversation.length > 0) {
          conversationId = existingConversation[0].id;
        } else {
          // Create new conversation
          const { data: newConversation, error: convError } = await supabaseClient
            .from("conversations")
            .insert({
              workspace_id: workspaceId,
              lead_id: leadId,
              channel: "email",
              status: "open",
              unread_count: 1,
              external_thread_id: email.messageId,
            })
            .select("id")
            .single();

          if (convError) {
            console.error("Error creating conversation:", convError);
            continue;
          }
          conversationId = newConversation.id;
        }

        // Create message
        const receivedAt = new Date(email.receivedTime).toISOString();
        const { error: msgError } = await supabaseClient
          .from("messages")
          .insert({
            workspace_id: workspaceId,
            conversation_id: conversationId,
            content: content,
            direction: "inbound",
            sent_at: receivedAt,
            external_message_id: email.messageId,
            email_subject: subject,
            email_message_id: emailContent?.messageIdHeader || email.messageId,
            email_in_reply_to: emailContent?.inReplyTo || null,
          });

        if (msgError) {
          console.error("Error creating message:", msgError);
          continue;
        }

        // Update conversation
        await supabaseClient
          .from("conversations")
          .update({
            last_message_at: receivedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);

        // Log activity
        await supabaseClient
          .from("crm_activities")
          .insert({
            workspace_id: workspaceId,
            entity_type: "conversation",
            entity_id: conversationId!,
            lead_id: leadId,
            conversation_id: conversationId,
            activity_type: "email_received",
            title: `Email recebido: ${subject}`,
            description: content.substring(0, 200),
            metadata: {
              from: sender.email,
              subject: subject,
              zoho_message_id: email.messageId,
            },
          });

        processedCount++;
      } catch (emailError) {
        console.error("Error processing email:", emailError);
      }
    }

    console.log(`Processed ${processedCount} emails, skipped ${skippedCount} duplicates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCount} emails`,
        processed: processedCount,
        skipped: skippedCount,
        total: emails.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
