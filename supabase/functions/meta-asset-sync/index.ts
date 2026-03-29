import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Meta Asset Sync — re-discovers and syncs assets from a Meta connection.
 * Also subscribes active pages to webhooks.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connection_id, workspace_id } = await req.json();
    if (!connection_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "connection_id and workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: conn, error: connError } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = conn.encrypted_access_token;
    let synced = 0;

    // Re-discover pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,fan_count,picture&limit=100&access_token=${token}`
    );

    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      for (const page of pagesData.data || []) {
        await supabase.from("meta_assets").upsert({
          workspace_id,
          connection_id,
          asset_type: "page",
          asset_id_external: page.id,
          asset_name: page.name,
          page_access_token: page.access_token,
          metadata_json: {
            category: page.category,
            fan_count: page.fan_count,
            picture_url: page.picture?.data?.url,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });
        synced++;

        // IG account
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
                connection_id,
                asset_type: "instagram_account",
                asset_id_external: ig.id,
                asset_name: ig.username || `IG ${ig.id}`,
                page_access_token: page.access_token,
                metadata_json: {
                  username: ig.username,
                  profile_picture_url: ig.profile_picture_url,
                  followers_count: ig.followers_count,
                  linked_page_id: page.id,
                },
                updated_at: new Date().toISOString(),
              }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });
              synced++;
            }
          }
        } catch {}

        // Lead forms
        try {
          const formsRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}/leadgen_forms?fields=id,name,status&access_token=${page.access_token}`
          );
          if (formsRes.ok) {
            const formsData = await formsRes.json();
            for (const form of formsData.data || []) {
              await supabase.from("meta_assets").upsert({
                workspace_id,
                connection_id,
                asset_type: "lead_form",
                asset_id_external: form.id,
                asset_name: form.name,
                asset_status: form.status === "ACTIVE" ? "discovered" : "inactive",
                metadata_json: { linked_page_id: page.id, form_status: form.status },
                updated_at: new Date().toISOString(),
              }, { onConflict: "workspace_id,connection_id,asset_type,asset_id_external" });
              synced++;
            }
          }
        } catch {}

        // Subscribe page to webhooks if selected_for_use
        const { data: activeAsset } = await supabase
          .from("meta_assets")
          .select("selected_for_use")
          .eq("workspace_id", workspace_id)
          .eq("asset_id_external", page.id)
          .eq("asset_type", "page")
          .maybeSingle();

        if (activeAsset?.selected_for_use) {
          try {
            await fetch(
              `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscribed_fields: ["leadgen", "messages", "messaging_postbacks", "feed"],
                  access_token: page.access_token,
                }),
              }
            );
            console.log(`[meta-asset-sync] Subscribed page ${page.id} to webhooks`);
          } catch (e) {
            console.warn(`[meta-asset-sync] Webhook subscription failed for page ${page.id}:`, e);
          }
        }
      }
    }

    // Update connection last_sync_at
    await supabase.from("meta_connections").update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", connection_id);

    return new Response(JSON.stringify({ synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[meta-asset-sync] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
