import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const BodySchema = z.object({
  workspaceId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  to: z.string().min(1).max(20),
  message: z.string().min(1).max(1600),
  leadId: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // --- Input validation ---
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { workspaceId, conversationId, to, message, leadId } = parsed.data;

    // --- Workspace membership ---
    const isSuperAdmin =
      (claimsData.claims as any).user_metadata?.is_super_admin === true ||
      (claimsData.claims as any).app_metadata?.is_super_admin === true;

    if (!isSuperAdmin) {
      const { data: membership } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Get Twilio connection ---
    const { data: twilioConn, error: connError } = await supabaseAdmin
      .from("twilio_connections")
      .select("twilio_phone_number, is_active")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (connError) throw connError;
    if (!twilioConn || !twilioConn.is_active) {
      return new Response(
        JSON.stringify({ error: "Twilio não configurado ou inactivo neste workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Gateway secrets ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) {
      throw new Error("TWILIO_API_KEY is not configured");
    }

    // --- Send SMS via gateway ---
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: twilioConn.twilio_phone_number,
        Body: message,
      }),
    });

    const twilioData = await response.json();
    if (!response.ok) {
      console.error("[twilio-send-sms] Twilio error:", JSON.stringify(twilioData));
      return new Response(
        JSON.stringify({
          error: `Twilio API error [${response.status}]`,
          details: twilioData?.message || twilioData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Save message in DB ---
    let finalConversationId = conversationId;

    if (!finalConversationId) {
      // Create conversation
      const { data: conv, error: convErr } = await supabaseAdmin
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          channel: "sms",
          status: "open",
          last_message_at: new Date().toISOString(),
          lead_id: leadId || null,
          channel_metadata: { source: "twilio", phone: to },
        })
        .select("id")
        .single();

      if (convErr) throw convErr;
      finalConversationId = conv.id;
    }

    const { data: savedMsg, error: msgErr } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: finalConversationId,
        workspace_id: workspaceId,
        direction: "outbound",
        content: message,
        attachments: [],
        sender_id: userId,
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (msgErr) {
      console.warn("[twilio-send-sms] Message sent but DB save failed:", msgErr.message);
    }

    // Update conversation preview
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.substring(0, 100),
        last_message_direction: "outbound",
      })
      .eq("id", finalConversationId);

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        messageId: savedMsg?.id,
        conversationId: finalConversationId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[twilio-send-sms] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
