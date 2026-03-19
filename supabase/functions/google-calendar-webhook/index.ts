import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-resource-uri, x-goog-message-number",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Google sends POST for push notifications
  if (req.method !== "POST") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const resourceState = req.headers.get("x-goog-resource-state");
    const channelToken = req.headers.get("x-goog-channel-token");

    // channelToken format: workspace_id:calendar_id
    if (!channelToken || !channelToken.includes(":")) {
      console.log("Invalid or missing channel token");
      return new Response("OK", { status: 200 });
    }

    // Only process "exists" (actual changes) — ignore "sync" (initial confirmation)
    if (resourceState === "sync") {
      console.log("Webhook sync confirmation received");
      return new Response("OK", { status: 200 });
    }

    const [workspaceId, calendarId] = channelToken.split(":");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify sync config exists
    const { data: syncConfig } = await adminClient
      .from("google_calendar_sync")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("calendar_id", calendarId)
      .eq("is_active", true)
      .maybeSingle();

    if (!syncConfig) {
      console.log("No active sync config found for webhook");
      return new Response("OK", { status: 200 });
    }

    // Trigger a pull sync via the google-calendar-sync function
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const syncUrl = `${supabaseUrl}/functions/v1/google-calendar-sync`;

    // Use service role to call the sync (webhook has no user context)
    await fetch(syncUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "pull",
        workspace_id: workspaceId,
        calendar_id: calendarId,
      }),
    });

    console.log(`Webhook triggered pull for workspace=${workspaceId}, calendar=${calendarId}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});
