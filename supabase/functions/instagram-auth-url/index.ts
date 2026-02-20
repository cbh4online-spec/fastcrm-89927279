const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, userId, redirectUrl } = await req.json();

    if (!workspaceId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing workspaceId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!META_APP_ID) {
      return new Response(
        JSON.stringify({ error: "Meta App ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callbackUri = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;
    const state = `${workspaceId}:${userId}`;
    // Facebook Login for Business - scopes for Instagram messaging
    const scope = "instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement";

    // Use Facebook OAuth endpoint
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&state=${state}&scope=${scope}&response_type=code`;

    return new Response(
      JSON.stringify({ authUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
