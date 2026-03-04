import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-PAYOUTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date().toISOString();

    // ── 1. Approve held affiliate attributions past hold period ──
    const { data: heldAffiliates, error: affErr } = await supabase
      .from("c2c_affiliate_attributions")
      .select("*, c2c_affiliates!inner(user_id)")
      .eq("status", "held")
      .lte("hold_until", now);

    if (affErr) logStep("Error fetching held affiliates", { error: affErr.message });

    let approvedCount = 0;
    const earningsByUser: Record<string, { total: number; workspace_id: string; items: string[] }> = {};

    for (const attr of heldAffiliates || []) {
      await supabase.from("c2c_affiliate_attributions")
        .update({ status: "approved", approved_at: now })
        .eq("id", attr.id);

      const userId = (attr as any).c2c_affiliates?.user_id;
      if (userId) {
        if (!earningsByUser[userId]) {
          earningsByUser[userId] = { total: 0, workspace_id: attr.workspace_id, items: [] };
        }
        earningsByUser[userId].total += attr.commission_amount;
        earningsByUser[userId].items.push(attr.id);
      }
      approvedCount++;
    }

    logStep("Approved affiliate attributions", { count: approvedCount });

    // ── 2. Approve held referral attributions ──
    const { data: heldReferrals } = await supabase
      .from("c2c_referral_attributions")
      .select("*, c2c_referrals!inner(referrer_user_id)")
      .eq("status", "held")
      .lte("hold_until", now);

    for (const attr of heldReferrals || []) {
      await supabase.from("c2c_referral_attributions")
        .update({ status: "approved", approved_at: now })
        .eq("id", attr.id);

      const userId = (attr as any).c2c_referrals?.referrer_user_id;
      if (userId) {
        if (!earningsByUser[userId]) {
          earningsByUser[userId] = { total: 0, workspace_id: attr.workspace_id, items: [] };
        }
        earningsByUser[userId].total += attr.reward_amount;
        earningsByUser[userId].items.push(attr.id);
      }
    }

    // ── 3. Create payouts for approved earnings ──
    let payoutsCreated = 0;
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 86400000 * 7); // last 7 days

    for (const [userId, data] of Object.entries(earningsByUser)) {
      if (data.total > 0) {
        await supabase.from("c2c_payouts").insert({
          workspace_id: data.workspace_id,
          user_id: userId,
          payout_type: "affiliate_commission",
          amount: data.total,
          currency: "EUR",
          status: "queued",
          method: "manual_iban",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          notes: `Auto-generated. Items: ${data.items.join(", ")}`,
        });
        payoutsCreated++;
      }
    }

    logStep("Payouts created", { count: payoutsCreated });

    return new Response(JSON.stringify({
      approved_affiliates: approvedCount,
      approved_referrals: (heldReferrals || []).length,
      payouts_created: payoutsCreated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
