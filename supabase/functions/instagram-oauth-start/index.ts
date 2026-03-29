const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, user_id, redirect_url } = await req.json();

    if (!workspace_id || !user_id) {
      return new Response(JSON.stringify({ error: "workspace_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INSTAGRAM_APP_ID = Deno.env.get("INSTAGRAM_APP_ID");
    if (!INSTAGRAM_APP_ID) {
      return new Response(JSON.stringify({ error: "INSTAGRAM_APP_ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;

    const state = JSON.stringify({
      workspace_id,
      user_id,
      redirect_url: redirect_url || null,
    });
    const stateEncoded = btoa(state);

    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ].join(",");

    const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(stateEncoded)}&scope=${scopes}&response_type=code`;

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[instagram-oauth-start] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
