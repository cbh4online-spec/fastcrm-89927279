import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkMX(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!resp.ok) return true; // If DNS check fails, assume valid
    const data = await resp.json();
    return (data.Answer && data.Answer.length > 0) || false;
  } catch {
    return true; // On error, don't block
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("workspace_id")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const workspaceId = campaign.workspace_id;

    // Verify workspace membership
    const { data: member } = await supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", claimsData.claims.sub).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get recipients
    const { data: recipients } = await supabase
      .from("marketing_recipients")
      .select("id, email, status")
      .eq("campaign_id", campaign_id);

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ total: 0, valid: 0, invalid: 0, suppressed: 0, reasons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get suppression list
    const { data: suppressions } = await supabase
      .from("campaign_suppressions")
      .select("email")
      .eq("workspace_id", workspaceId);

    const suppressedEmails = new Set((suppressions || []).map(s => s.email.toLowerCase()));

    let valid = 0;
    let invalid = 0;
    let suppressed = 0;
    const reasons: Array<{ email: string; reason: string }> = [];
    const mxCache = new Map<string, boolean>();

    for (const r of recipients) {
      const email = r.email?.toLowerCase();
      if (!email) {
        invalid++;
        reasons.push({ email: r.email || "unknown", reason: "Email vazio" });
        continue;
      }

      // Check suppression
      if (suppressedEmails.has(email)) {
        suppressed++;
        reasons.push({ email, reason: "Na lista de supressão" });
        await supabase.from("marketing_recipients").update({ status: "suppressed" }).eq("id", r.id);
        continue;
      }

      // Check syntax
      if (!EMAIL_REGEX.test(email)) {
        invalid++;
        reasons.push({ email, reason: "Formato inválido" });
        await supabase.from("marketing_recipients").update({ status: "invalid" }).eq("id", r.id);
        continue;
      }

      // Check MX
      const domain = email.split("@")[1];
      if (!mxCache.has(domain)) {
        mxCache.set(domain, await checkMX(domain));
      }

      if (!mxCache.get(domain)) {
        invalid++;
        reasons.push({ email, reason: "Domínio sem registos MX" });
        await supabase.from("marketing_recipients").update({ status: "invalid" }).eq("id", r.id);
        continue;
      }

      valid++;
    }

    // Update campaign
    await supabase.from("marketing_campaigns").update({
      validated_count: valid,
      invalid_count: invalid,
      suppression_count: suppressed,
      validation_run_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({
      total: recipients.length,
      valid,
      invalid,
      suppressed,
      reasons: reasons.slice(0, 100),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in email-validate-list:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
