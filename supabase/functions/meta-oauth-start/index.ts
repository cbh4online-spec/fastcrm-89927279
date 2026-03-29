import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const META_APP_ID = Deno.env.get("META_APP_ID");
    if (!META_APP_ID) {
      return new Response(JSON.stringify({ error: "META_APP_ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // State encodes workspace_id, user_id and optional redirect
    const state = JSON.stringify({
      workspace_id,
      user_id,
      redirect_url: redirect_url || null,
    });

    const stateEncoded = btoa(state);

    // Request comprehensive permissions for Phase 1
    const scopes = [
      "pages_show_list",
      "pages_manage_metadata",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_messaging",
      "instagram_basic",
      "instagram_manage_messages",
      "leads_retrieval",
      "pages_read_user_content",
      "business_management",
    ].join(",");

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(stateEncoded)}&scope=${scopes}&response_type=code`;

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[meta-oauth-start] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
