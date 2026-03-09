const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_EVENT_TYPES = [
  "page_view",
  "scroll_depth",
  "cta_click",
  "error_shown",
  "rage_click",
  "dead_click",
  "scroll_abandon",
  "empty_state",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : [body];

    if (events.length === 0 || events.length > 50) {
      return new Response(
        JSON.stringify({ error: "Send 1-50 events per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rows = events
      .filter((e: any) => e.event_type && VALID_EVENT_TYPES.includes(e.event_type))
      .map((e: any) => ({
        event_type: e.event_type,
        event_data: e.event_data || {},
        workspace_id: e.workspace_id || null,
        entity_id: e.entity_id || null,
        visitor_id: e.visitor_id || null,
        session_id: e.session_id || null,
        page_url: e.page_url || null,
        page_type: e.page_type || null,
        referrer: e.referrer || null,
        utm_source: e.utm_source || null,
        utm_medium: e.utm_medium || null,
        utm_campaign: e.utm_campaign || null,
        device_type: e.device_type || null,
        country_code: e.country_code || null,
      }));

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("seo_page_analytics").insert(rows);

    if (error) {
      console.error("[SEO-TRACK] Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEO-TRACK] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
