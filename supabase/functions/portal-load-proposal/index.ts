// Carrega proposta pública via public_token (sem auth)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: proposal, error } = await sb
      .from("proposals")
      .select("id, workspace_id, title, content_blocks, price, currency, status, expires_at, validity_days, payment_conditions, public_token, opportunity_id, contact_id, company_id")
      .eq("public_token", token)
      .maybeSingle();
    if (error || !proposal) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Track session
    await sb.from("customer_portal_sessions").insert({
      proposal_id: proposal.id, token, event_type: "viewed",
      user_agent: req.headers.get("user-agent") ?? null,
    });
    await sb.from("proposals").update({ last_viewed_at: new Date().toISOString() }).eq("id", proposal.id);
    // Sanitized public payload
    const expired = proposal.expires_at && new Date(proposal.expires_at) < new Date();
    return new Response(JSON.stringify({
      id: proposal.id,
      title: proposal.title,
      content_blocks: proposal.content_blocks,
      price: proposal.price,
      currency: proposal.currency,
      status: proposal.status,
      expires_at: proposal.expires_at,
      payment_conditions: proposal.payment_conditions,
      expired,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-load-proposal error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
