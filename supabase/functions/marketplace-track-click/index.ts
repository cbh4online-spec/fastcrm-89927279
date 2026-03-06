import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[MARKETPLACE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { affiliate_code, referral_code, target_type, target_id, user_agent, referrer_url, landing_url } = await req.json();
    logStep("Input received", { affiliate_code, referral_code, target_type });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await hashString(clientIp);
    const uaHash = user_agent ? await hashString(user_agent) : null;
    const sessionId = crypto.randomUUID();

    // Handle affiliate click
    if (affiliate_code) {
      const { data: affiliate } = await supabase
        .from("c2c_affiliates")
        .select("id, program_id, workspace_id, status")
        .eq("affiliate_code", affiliate_code)
        .eq("status", "active")
        .single();

      if (!affiliate) {
        return new Response(JSON.stringify({ error: "Invalid affiliate code" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: max 10 clicks per IP per affiliate per hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count } = await supabase
        .from("c2c_affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .eq("ip_hash", ipHash)
        .gte("created_at", oneHourAgo);

      if ((count || 0) >= 10) {
        logStep("Rate limited", { ipHash, affiliateId: affiliate.id });
        return new Response(JSON.stringify({ session_id: sessionId, rate_limited: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("c2c_affiliate_clicks").insert({
        program_id: affiliate.program_id,
        affiliate_id: affiliate.id,
        workspace_id: affiliate.workspace_id,
        session_id: sessionId,
        visitor_fingerprint_hash: `${ipHash}-${uaHash}`,
        ip_hash: ipHash,
        user_agent_hash: uaHash,
        referrer_url: referrer_url || null,
        landing_url: landing_url || null,
      });

      // Update click count
      await supabase.rpc("increment_field", { row_id: affiliate.id, table_name: "c2c_affiliates", field_name: "total_clicks" })
        .then(() => {})
        .catch(() => {
          supabase.from("c2c_affiliates")
            .update({ total_clicks: (affiliate as any).total_clicks + 1 })
            .eq("id", affiliate.id);
        });

      logStep("Click recorded", { affiliateId: affiliate.id, sessionId });
      return new Response(JSON.stringify({ session_id: sessionId, affiliate_id: affiliate.id, workspace_id: affiliate.workspace_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle referral tracking
    if (referral_code) {
      const { data: referral } = await supabase
        .from("c2c_referrals")
        .select("id, program_id, workspace_id, referrer_user_id")
        .eq("referral_code", referral_code)
        .eq("status", "invited")
        .single();

      if (!referral) {
        return new Response(JSON.stringify({ error: "Invalid referral code" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Referral tracked", { referralId: referral.id, sessionId });
      return new Response(JSON.stringify({ session_id: sessionId, referral_id: referral.id, workspace_id: referral.workspace_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "affiliate_code or referral_code required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
