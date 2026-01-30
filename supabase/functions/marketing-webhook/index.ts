import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Resend Webhook Handler for Marketing Email Events
 * 
 * Processes events: email.delivered, email.opened, email.clicked, 
 * email.bounced, email.complained, email.unsubscribed
 * 
 * Webhook must be configured in Resend dashboard:
 * https://resend.com/webhooks
 */

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at?: string;
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      message: string;
      type?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for webhook processing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ResendWebhookPayload = await req.json();
    
    console.log("Received Resend webhook:", payload.type, payload.data?.email_id);

    const resendId = payload.data?.email_id;
    if (!resendId) {
      console.log("No email_id in webhook payload");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the recipient by resend_id
    const { data: recipient, error: recipientError } = await supabase
      .from("marketing_recipients")
      .select("id, campaign_id, email, workspace_id")
      .eq("resend_id", resendId)
      .single();

    if (recipientError || !recipient) {
      console.log("Recipient not found for resend_id:", resendId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const eventType = payload.type;

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.unsubscribed": "unsubscribed",
    };

    const mappedEventType = eventTypeMap[eventType];
    if (!mappedEventType) {
      console.log("Unknown event type:", eventType);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert event record
    await supabase.from("marketing_events").insert({
      workspace_id: recipient.workspace_id,
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      event_type: mappedEventType,
      email: recipient.email,
      link_url: payload.data.click?.link || null,
      metadata: {
        resend_event: payload.type,
        resend_created_at: payload.created_at,
        bounce_message: payload.data.bounce?.message,
        bounce_type: payload.data.bounce?.type,
      },
      occurred_at: payload.created_at || now,
    });

    // Update recipient record based on event type
    const recipientUpdate: Record<string, unknown> = {
      updated_at: now,
    };

    switch (mappedEventType) {
      case "delivered":
        recipientUpdate.status = "delivered";
        recipientUpdate.delivered_at = now;
        break;
      case "opened":
        recipientUpdate.status = "opened";
        recipientUpdate.opened_at = now;
        break;
      case "clicked":
        recipientUpdate.status = "clicked";
        recipientUpdate.clicked_at = now;
        break;
      case "bounced":
        recipientUpdate.status = "bounced";
        recipientUpdate.bounced_at = now;
        recipientUpdate.bounce_type = payload.data.bounce?.type || "unknown";
        recipientUpdate.bounce_reason = payload.data.bounce?.message || "Unknown bounce reason";
        break;
      case "complained":
        recipientUpdate.status = "complained";
        break;
      case "unsubscribed":
        recipientUpdate.status = "unsubscribed";
        break;
    }

    await supabase
      .from("marketing_recipients")
      .update(recipientUpdate)
      .eq("id", recipient.id);

    // Update campaign counts
    const campaignUpdate: Record<string, unknown> = {};
    
    switch (mappedEventType) {
      case "delivered":
        // Increment delivered_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "delivered_count",
        });
        break;
      case "opened":
        // Increment opened_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "opened_count",
        });
        break;
      case "clicked":
        // Increment clicked_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "clicked_count",
        });
        break;
      case "bounced":
        // Increment bounced_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "bounced_count",
        });
        break;
      case "complained":
        // Increment complained_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "complained_count",
        });
        break;
      case "unsubscribed":
        // Increment unsubscribed_count
        await supabase.rpc("increment_campaign_stat", {
          p_campaign_id: recipient.campaign_id,
          p_field: "unsubscribed_count",
        });
        break;
    }

    console.log(`Processed ${mappedEventType} event for recipient ${recipient.id}`);

    return new Response(JSON.stringify({ received: true, processed: mappedEventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    // Return 200 to prevent Resend from retrying
    return new Response(JSON.stringify({ received: true, error: "Processing error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
