import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
  const APP_URL = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("[meta-oauth-callback] OAuth error:", error);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=${error}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=missing_params`, 302);
    }

    // Decode state
    let state: { workspace_id: string; user_id: string; redirect_url?: string };
    try {
      state = JSON.parse(atob(decodeURIComponent(stateParam)));
    } catch {
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=invalid_state`, 302);
    }

    const { workspace_id, user_id } = state;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // 1. Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${META_APP_SECRET}&code=${code}`
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[meta-oauth-callback] Token exchange failed:", errText);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const userAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000;

    // 2. Get long-lived token
    let longLivedToken = userAccessToken;
    let tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    try {
      const llRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${userAccessToken}`
      );
      if (llRes.ok) {
        const llData = await llRes.json();
        longLivedToken = llData.access_token;
        tokenExpiry = new Date(Date.now() + (llData.expires_in || 5184000) * 1000);
      }
    } catch (e) {
      console.warn("[meta-oauth-callback] Long-lived token exchange failed, using short-lived");
    }

    // 3. Get user info
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${longLivedToken}`);
    const meData = meRes.ok ? await meRes.json() : { id: "unknown", name: "Unknown" };

    // 4. Create connection record
    const { data: connection, error: connError } = await supabase
      .from("meta_connections")
      .insert({
        workspace_id,
        provider: "facebook",
        status: "active",
        connection_name: meData.name || "Meta Connection",
        meta_user_id: meData.id,
        token_type: "user_access_token",
        encrypted_access_token: longLivedToken,
        expires_at: tokenExpiry.toISOString(),
        scopes_json: ["pages_show_list", "pages_manage_metadata", "pages_read_engagement", "pages_manage_posts", "pages_messaging", "instagram_basic", "instagram_manage_messages", "leads_retrieval"],
        health_status: "healthy",
        last_healthcheck_at: new Date().toISOString(),
        created_by: user_id,
      })
      .select("id")
      .single();

    if (connError) {
      console.error("[meta-oauth-callback] DB error:", connError);
      return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=db_error`, 302);
    }

    const connectionId = connection.id;

    // 5. Discover assets: Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,fan_count,picture&limit=100&access_token=${longLivedToken}`
    );

    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      for (const page of pagesData.data || []) {
        // Insert page asset
        await supabase.from("meta_assets").upsert({
          workspace_id,
          connection_id: connectionId,
          asset_type: "page",
          asset_id_external: page.id,
          asset_name: page.name,
          asset_status: "discovered",
          page_access_token: page.access_token,
          metadata_json: {
            category: page.category,
            fan_count: page.fan_count,
            picture_url: page.picture?.data?.url,
          },
        }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });

        // Discover IG account linked to page
        try {
          const igRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${page.access_token}`
          );
          if (igRes.ok) {
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
              const ig = igData.instagram_business_account;
              await supabase.from("meta_assets").upsert({
                workspace_id,
                connection_id: connectionId,
                asset_type: "instagram_account",
                asset_id_external: ig.id,
                asset_name: ig.username || `IG ${ig.id}`,
                asset_status: "discovered",
                page_access_token: page.access_token,
                metadata_json: {
                  username: ig.username,
                  profile_picture_url: ig.profile_picture_url,
                  followers_count: ig.followers_count,
                  linked_page_id: page.id,
                },
              }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });
            }
          }
        } catch (e) {
          console.warn("[meta-oauth-callback] IG discovery failed for page:", page.id);
        }

        // Discover lead forms for page
        try {
          const formsRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}/leadgen_forms?fields=id,name,status&access_token=${page.access_token}`
          );
          if (formsRes.ok) {
            const formsData = await formsRes.json();
            for (const form of formsData.data || []) {
              await supabase.from("meta_assets").upsert({
                workspace_id,
                connection_id: connectionId,
                asset_type: "lead_form",
                asset_id_external: form.id,
                asset_name: form.name,
                asset_status: form.status === "ACTIVE" ? "discovered" : "inactive",
                metadata_json: { linked_page_id: page.id, form_status: form.status },
              }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });
            }
          }
        } catch (e) {
          console.warn("[meta-oauth-callback] Form discovery failed for page:", page.id);
        }
      }
    }

    // 6. Subscribe to webhooks for active pages
    // This is done in meta-asset-sync when pages are activated

    const redirectUrl = state.redirect_url || `${APP_URL}/dashboard/meta/connections?connected=true`;
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("[meta-oauth-callback] Error:", error);
    return Response.redirect(`${APP_URL}/dashboard/meta/connections?error=unexpected`, 302);
  }
});
