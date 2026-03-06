import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[MARKETPLACE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function emitKernelEvent(supabaseUrl: string, supabaseKey: string, event: Record<string, unknown>) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/kernel-ingest-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ actor_type: "system", schema_version: 1, occurred_at: new Date().toISOString(), ...event }),
    });
  } catch (err) {
    logStep("Kernel emit failed (non-blocking)", { error: String(err) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      workspace_id, listing_id, buyer_user_id, seller_user_id,
      sale_amount, session_id, referral_code,
    } = await req.json();

    logStep("Attribution request", { workspace_id, listing_id, buyer_user_id, sale_amount });

    // ── 1. Affiliate Attribution ──
    if (session_id) {
      const { data: click } = await supabase
        .from("c2c_affiliate_clicks")
        .select("*, c2c_affiliates!inner(user_id, program_id)")
        .eq("session_id", session_id)
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (click) {
        const affiliateUserId = (click as any).c2c_affiliates?.user_id;

        if (affiliateUserId === buyer_user_id) {
          logStep("BLOCKED self-affiliate", { affiliateUserId, buyer_user_id });
        } else {
          const { data: program } = await supabase
            .from("c2c_affiliate_programs")
            .select("*")
            .eq("id", click.program_id)
            .eq("status", "active")
            .single();

          if (program) {
            const clickDate = new Date(click.created_at);
            const windowEnd = new Date(clickDate.getTime() + program.cookie_window_days * 86400000);

            if (new Date() <= windowEnd) {
              const commissionAmount = program.default_commission_type === "percent"
                ? (parseFloat(sale_amount) * program.default_commission_value / 100)
                : program.default_commission_value;

              const holdUntil = new Date();
              holdUntil.setDate(holdUntil.getDate() + program.payout_hold_days);

              const { error } = await supabase.from("c2c_affiliate_attributions").insert({
                program_id: program.id,
                affiliate_id: click.affiliate_id,
                workspace_id,
                order_id: listing_id,
                listing_id,
                commission_type: program.default_commission_type,
                commission_value: program.default_commission_value,
                commission_amount: commissionAmount,
                status: "held",
                hold_until: holdUntil.toISOString(),
              });

              if (error) {
                logStep("Error creating attribution", { error: error.message });
              } else {
                logStep("Affiliate attribution created", { affiliateId: click.affiliate_id, amount: commissionAmount });
                emitKernelEvent(supabaseUrl, supabaseKey, {
                  workspace_id,
                  type: "MARKETPLACE.AFFILIATE_ATTRIBUTED",
                  entity_kind: "c2c_affiliate_attribution",
                  entity_id: click.affiliate_id,
                  source_module: "store-marketplace",
                  payload: { listing_id, affiliate_id: click.affiliate_id, commission: commissionAmount },
                });
              }
            } else {
              logStep("Click outside cookie window", { clickDate: click.created_at });
            }
          }
        }
      }
    }

    // ── 2. Referral Attribution ──
    if (referral_code) {
      const { data: referral } = await supabase
        .from("c2c_referrals")
        .select("*, c2c_referral_programs!inner(*)")
        .eq("referral_code", referral_code)
        .eq("workspace_id", workspace_id)
        .maybeSingle();

      if (referral) {
        if (referral.referrer_user_id === buyer_user_id) {
          logStep("BLOCKED self-referral", { referrer: referral.referrer_user_id });
        } else {
          const program = (referral as any).c2c_referral_programs;
          if (program && program.status === "active") {
            const holdUntil = new Date();
            holdUntil.setDate(holdUntil.getDate() + (program.hold_days || 7));

            const rewardAmount = program.reward_type === "percent_discount"
              ? (parseFloat(sale_amount) * program.reward_value / 100)
              : program.reward_value;

            await supabase.from("c2c_referral_attributions").insert({
              referral_id: referral.id,
              workspace_id,
              order_id: listing_id,
              reward_amount: rewardAmount,
              status: "held",
              hold_until: holdUntil.toISOString(),
            });

            await supabase.from("c2c_referrals")
              .update({ status: "qualified", qualified_at: new Date().toISOString() })
              .eq("id", referral.id);

            logStep("Referral attribution created", { referralId: referral.id, amount: rewardAmount });
          }
        }
      }
    }

    // ── 3. Order event ──
    await supabase.from("c2c_order_events").insert({
      workspace_id,
      order_id: listing_id || "unknown",
      event_type: "attributed",
      payload: { buyer_user_id, seller_user_id, sale_amount, session_id, referral_code },
    });

    return new Response(JSON.stringify({ success: true }), {
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
