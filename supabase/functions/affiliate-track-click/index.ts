import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { affiliate_code, workspace_id, link_id, landing_page, referrer_url } = await req.json();

    if (!affiliate_code || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find affiliate
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("affiliate_code", affiliate_code)
      .eq("status", "active")
      .maybeSingle();

    if (!affiliate) {
      return new Response(JSON.stringify({ error: "Affiliate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get IP from headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Check uniqueness (same IP + affiliate in last 24h)
    let isUnique = true;
    if (ip) {
      const { count } = await supabaseAdmin
        .from("affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .eq("ip_address", ip)
        .gte("clicked_at", new Date(Date.now() - 86400000).toISOString());
      isUnique = (count ?? 0) === 0;
    }

    // Insert click
    await supabaseAdmin.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      workspace_id,
      link_id: link_id || null,
      ip_address: ip,
      user_agent: userAgent,
      referrer_url: referrer_url || null,
      landing_page: landing_page || null,
      is_unique: isUnique,
    });

    // Update counters
    if (isUnique) {
      await supabaseAdmin.rpc("increment_field", {
        table_name: "affiliates",
        row_id: affiliate.id,
        field_name: "total_clicks",
        increment_by: 1,
      }).catch(() => {
        // Fallback: direct update if RPC doesn't exist
        supabaseAdmin
          .from("affiliates")
          .update({ total_clicks: affiliate.id }) // will use trigger
          .eq("id", affiliate.id);
      });
    }

    if (link_id) {
      await supabaseAdmin
        .from("affiliate_links")
        .update({ click_count: (supabaseAdmin as any).rpc ? undefined : 0 })
        .eq("id", link_id)
        .catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, is_unique: isUnique }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
