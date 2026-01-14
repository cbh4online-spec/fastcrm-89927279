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
      const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?instagram_error=${error}` },
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

    // Exchange code for access token using Facebook Graph API
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // Default 60 days

    // Get the user's Facebook Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`
    );

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error("Failed to get pages:", errorText);
      throw new Error("Failed to get Facebook Pages");
    }

    const pagesData = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.error("No Facebook Pages found");
      throw new Error("No Facebook Pages connected. Please connect a Facebook Page to your Instagram account.");
    }

    // Get the first page and its Instagram Business Account
    const page = pagesData.data[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    // Get Instagram Business Account connected to the page
    const igAccountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    if (!igAccountResponse.ok) {
      const errorText = await igAccountResponse.text();
      console.error("Failed to get Instagram account:", errorText);
      throw new Error("Failed to get Instagram Business Account");
    }

    const igAccountData = await igAccountResponse.json();
    
    if (!igAccountData.instagram_business_account) {
      console.error("No Instagram Business Account connected to page");
      throw new Error("No Instagram Business Account connected to this Facebook Page");
    }

    const instagramUserId = igAccountData.instagram_business_account.id;

    // Get Instagram username
    const igUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramUserId}?fields=id,username&access_token=${pageAccessToken}`
    );

    let instagramUsername = null;
    if (igUserResponse.ok) {
      const igUserData = await igUserResponse.json();
      instagramUsername = igUserData.username;
    }

    // Use page access token for messaging (it has the required permissions)
    const accessToken = pageAccessToken;

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
      headers: { Location: `${appUrl}/dashboard/settings?instagram_connected=true` },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard/settings?instagram_error=connection_failed` },
    });
  }
});
