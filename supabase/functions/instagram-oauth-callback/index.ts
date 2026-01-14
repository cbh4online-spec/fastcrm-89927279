import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // Contains workspace_id and user_id
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: `/settings?instagram_error=${error}` },
      });
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing code or state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse state (workspace_id:user_id)
    const [workspaceId, userId] = state.split(":");
    if (!workspaceId || !userId) {
      return new Response(JSON.stringify({ error: "Invalid state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error("Missing Meta app credentials");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;

    // Exchange code for short-lived access token
    const tokenResponse = await fetch(
      `https://api.instagram.com/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code: code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    // Exchange for long-lived access token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${META_APP_SECRET}&access_token=${shortLivedToken}`
    );

    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text();
      console.error("Long-lived token exchange failed:", errorText);
      throw new Error("Failed to get long-lived token");
    }

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // seconds

    // Get Instagram username
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );

    let instagramUsername = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      instagramUsername = userData.username;
    }

    // Get connected Facebook Page ID (needed for messaging)
    // For Instagram Professional accounts, we need the connected page
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    let pageId = instagramUserId; // Fallback
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      if (pagesData.data && pagesData.data.length > 0) {
        pageId = pagesData.data[0].id;
      }
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save to database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: upsertError } = await supabase
      .from("instagram_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          instagram_user_id: instagramUserId.toString(),
          instagram_username: instagramUsername,
          page_id: pageId,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_by: userId,
        },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to save connection");
    }

    // Redirect back to settings with success
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/settings?instagram_connected=true` },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/settings?instagram_error=connection_failed` },
    });
  }
});
