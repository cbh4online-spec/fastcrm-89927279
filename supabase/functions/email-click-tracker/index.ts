import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("c");
    const recipientHash = url.searchParams.get("r");
    const encodedUrl = url.searchParams.get("u");
    const pos = url.searchParams.get("p");
    const workspaceId = url.searchParams.get("w");

    if (!encodedUrl) {
      return new Response("Missing URL", { status: 400 });
    }

    const targetUrl = decodeURIComponent(encodedUrl);

    // Log click asynchronously - don't block redirect
    if (campaignId && workspaceId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Fire and forget
      supabase.from("campaign_link_clicks").insert({
        campaign_id: campaignId,
        workspace_id: workspaceId,
        recipient_email: recipientHash ? decodeURIComponent(recipientHash) : null,
        link_url: targetUrl,
        link_position: pos ? parseInt(pos) : null,
        user_agent: req.headers.get("user-agent"),
        ip_hash: null, // Privacy: don't store IP
      }).then(() => {});

      // Also update marketing_events
      supabase.from("marketing_events").insert({
        campaign_id: campaignId,
        workspace_id: workspaceId,
        email: recipientHash ? decodeURIComponent(recipientHash) : null,
        event_type: "clicked",
        link_url: targetUrl,
        user_agent: req.headers.get("user-agent"),
        occurred_at: new Date().toISOString(),
      }).then(() => {});

      // Increment campaign clicked_count
      supabase.rpc("increment_marketing_usage", {}).catch(() => {});
    }

    // Redirect immediately
    return new Response(null, {
      status: 302,
      headers: { Location: targetUrl, ...corsHeaders },
    });

  } catch (error) {
    console.error("Click tracker error:", error);
    return new Response("Error", { status: 500 });
  }
});
