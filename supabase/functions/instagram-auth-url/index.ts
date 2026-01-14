import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    // Instagram API with Instagram Login requires these scopes
    const scope = "instagram_business_basic,instagram_business_manage_messages";

    // Use Instagram OAuth endpoint (not Facebook)
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=${scope}&response_type=code&state=${state}`;

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
