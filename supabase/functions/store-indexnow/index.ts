/**
 * IndexNow — Notify search engines instantly when products are published/updated.
 * Called internally after product create/update operations.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { product_urls, store_slug } = body;
  if (!product_urls?.length || !store_slug) {
    return new Response(JSON.stringify({ error: "product_urls and store_slug required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Get IndexNow key from store settings
  const { data: settings } = await sb
    .from("store_settings")
    .select("indexnow_key, custom_domain")
    .eq("store_slug", store_slug)
    .single();

  const indexNowKey = settings?.indexnow_key;
  if (!indexNowKey) {
    return new Response(JSON.stringify({ success: true, indexed: false, reason: "no_indexnow_key" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const host = settings?.custom_domain || "fastcrm.lovable.app";

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key: indexNowKey,
        keyLocation: `https://${host}/${indexNowKey}.txt`,
        urlList: product_urls.slice(0, 10000),
      }),
    });

    const status = res.status;
    await res.text(); // consume body

    return new Response(JSON.stringify({ success: true, indexed: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[IndexNow] Error:", err.message);
    return new Response(JSON.stringify({ success: true, indexed: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
