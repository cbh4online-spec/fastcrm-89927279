/**
 * Facebook Conversions API (CAPI) — Server-Side Event Relay
 *
 * Receives events from the frontend and forwards them to the Facebook Graph API.
 * Requires facebook_pixel_id + facebook_capi_token in store_settings.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { event_name, event_id, event_source_url, custom_data, user_data, store_slug } = body;

  if (!event_name) {
    return new Response(JSON.stringify({ error: "event_name required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Try to resolve store settings with CAPI credentials
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Try by slug first, fallback to looking up any store with CAPI configured
  let pixelId: string | null = null;
  let capiToken: string | null = null;

  if (store_slug) {
    const { data: settings } = await sb
      .from("store_settings")
      .select("facebook_pixel_id, facebook_capi_token")
      .eq("store_slug", store_slug)
      .single();
    pixelId = settings?.facebook_pixel_id;
    capiToken = settings?.facebook_capi_token;
  }

  // If no CAPI credentials, just acknowledge — event was already tracked client-side
  if (!pixelId || !capiToken) {
    return new Response(JSON.stringify({ success: true, capi_sent: false, reason: "no_capi_credentials" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build CAPI payload
  const userData: Record<string, string> = {};
  if (user_data?.email) userData.em = [await sha256(user_data.email)];
  if (user_data?.phone) userData.ph = [await sha256(user_data.phone)];

  const eventData: any = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_id: event_id || `${Date.now()}`,
    event_source_url: event_source_url || "",
    user_data: userData,
  };

  if (custom_data) {
    eventData.custom_data = {
      value: custom_data.value,
      currency: custom_data.currency || "EUR",
      content_ids: custom_data.content_ids,
      content_type: "product",
      num_items: custom_data.num_items,
    };
  }

  try {
    const fbUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`;
    const fbRes = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventData] }),
    });
    const fbResult = await fbRes.json();

    return new Response(JSON.stringify({ success: true, capi_sent: true, fb_response: fbResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[CAPI] Error sending to Facebook:", err.message);
    return new Response(JSON.stringify({ success: true, capi_sent: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
