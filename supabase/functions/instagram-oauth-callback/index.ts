import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const INSTAGRAM_APP_ID = Deno.env.get("INSTAGRAM_APP_ID")!;
  const INSTAGRAM_APP_SECRET = Deno.env.get("INSTAGRAM_APP_SECRET")!;
  const APP_URL = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("[instagram-oauth-callback] OAuth error:", error);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_${error}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_missing_params`, 302);
    }

    let state: { workspace_id: string; user_id: string; redirect_url?: string };
    try {
      state = JSON.parse(atob(decodeURIComponent(stateParam)));
    } catch {
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_invalid_state`, 302);
    }

    const { workspace_id, user_id } = state;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;

    // 1. Exchange code for short-lived token (Instagram API uses form POST)
    const tokenForm = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
      code,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: tokenForm,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[instagram-oauth-callback] Token exchange failed:", errText);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id;

    // 2. Exchange for long-lived token
    let longLivedToken = shortLivedToken;
    let tokenExpiry = new Date(Date.now() + 3600 * 1000);
    try {
      const llRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`
      );
      if (llRes.ok) {
        const llData = await llRes.json();
        longLivedToken = llData.access_token;
        tokenExpiry = new Date(Date.now() + (llData.expires_in || 5184000) * 1000);
      } else {
        const llErr = await llRes.text();
        console.warn("[instagram-oauth-callback] Long-lived token exchange failed:", llErr);
      }
    } catch (e) {
      console.warn("[instagram-oauth-callback] Long-lived token exchange error:", e);
    }

    // 3. Get user info
    let username = `ig_${igUserId}`;
    let profilePictureUrl: string | null = null;
    let accountType: string | null = null;
    try {
      const meRes = await fetch(
        `https://graph.instagram.com/v22.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${longLivedToken}`
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        username = meData.username || username;
        profilePictureUrl = meData.profile_picture_url || null;
        accountType = meData.account_type || null;
      } else {
        const meErr = await meRes.text();
        console.warn("[instagram-oauth-callback] User info fetch failed:", meErr);
      }
    } catch (e) {
      console.warn("[instagram-oauth-callback] User info error:", e);
    }

    // 4. Create connection record in meta_connections
    const { data: connection, error: connError } = await supabase
      .from("meta_connections")
      .insert({
        workspace_id,
        provider: "instagram",
        status: "active",
        connection_name: `@${username}`,
        meta_user_id: String(igUserId),
        token_type: "instagram_long_lived",
        encrypted_access_token: longLivedToken,
        expires_at: tokenExpiry.toISOString(),
        scopes_json: [
          "instagram_business_basic",
          "instagram_business_manage_messages",
          "instagram_business_manage_comments",
        ],
        health_status: "healthy",
        last_healthcheck_at: new Date().toISOString(),
        created_by: user_id,
      })
      .select("id")
      .single();

    if (connError) {
      console.error("[instagram-oauth-callback] DB error:", connError);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_db_error`, 302);
    }

    const connectionId = connection.id;

    // 5. Insert instagram_account asset
    await supabase.from("meta_assets").upsert(
      {
        workspace_id,
        connection_id: connectionId,
        asset_type: "instagram_account",
        asset_id_external: String(igUserId),
        asset_name: `@${username}`,
        asset_status: "discovered",
        metadata_json: {
          username,
          profile_picture_url: profilePictureUrl,
          account_type: accountType,
        },
      },
      { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" }
    );

    const redirectUrl = state.redirect_url || `${APP_URL}/dashboard/meta/connections?connected=true`;
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("[instagram-oauth-callback] Error:", error);
    return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=ig_unexpected`, 302);
  }
});
