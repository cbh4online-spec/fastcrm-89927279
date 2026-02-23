import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find active plans where next_run_at <= now
    const { data: duePlans } = await supabase
      .from("b2b_subscription_plans")
      .select("*, items:b2b_subscription_plan_items(*, product:products(id, name, base_price))")
      .eq("status", "active")
      .lte("next_run_at", new Date().toISOString());

    if (!duePlans || duePlans.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const plan of duePlans) {
      const amount = (plan.items || []).reduce((s: number, it: any) => {
        const price = it.price_override ?? it.product?.base_price ?? 0;
        return s + price * it.qty;
      }, 0);

      // Check max_cycle_value
      if (plan.max_cycle_value && amount > plan.max_cycle_value) {
        await supabase.from("b2b_subscription_runs").insert({
          plan_id: plan.id,
          status: "needs_attention",
          amount,
          notes: `Valor ${amount.toFixed(2)}€ excede limite ${plan.max_cycle_value.toFixed(2)}€`,
        });
        continue;
      }

      const runStatus = plan.approval_mode === "auto" ? "draft" : "draft";
      await supabase.from("b2b_subscription_runs").insert({
        plan_id: plan.id,
        status: runStatus,
        amount,
        notes: `Ciclo automático — ${plan.cadence}`,
      });

      // Calculate next run
      const nextRun = new Date();
      if (plan.cadence === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);
      else if (plan.cadence === "bi-monthly") nextRun.setMonth(nextRun.getMonth() + 2);
      else if (plan.cadence === "quarterly") nextRun.setMonth(nextRun.getMonth() + 3);

      await supabase
        .from("b2b_subscription_plans")
        .update({ next_run_at: nextRun.toISOString(), updated_at: new Date().toISOString() })
        .eq("id", plan.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
