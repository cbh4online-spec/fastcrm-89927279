import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { planId, workspaceId, companyId, name, cadence, approval_mode, max_cycle_value, items } = await req.json();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Calculate next_run_at based on cadence
    const nextRun = new Date();
    if (cadence === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);
    else if (cadence === "bi-monthly") nextRun.setMonth(nextRun.getMonth() + 2);
    else if (cadence === "quarterly") nextRun.setMonth(nextRun.getMonth() + 3);

    const { data: plan, error: planError } = await supabase
      .from("b2b_subscription_plans")
      .insert({
        workspace_id: workspaceId,
        company_id: companyId,
        name,
        cadence,
        approval_mode: approval_mode || "approval_required",
        max_cycle_value: max_cycle_value || null,
        status: "draft",
        next_run_at: nextRun.toISOString(),
      })
      .select()
      .single();

    if (planError) throw planError;

    if (items && items.length > 0) {
      const { error: itemsError } = await supabase
        .from("b2b_subscription_plan_items")
        .insert(items.map((it: any) => ({
          plan_id: plan.id,
          product_id: it.product_id,
          qty: it.qty,
          price_override: it.price_override || null,
        })));
      if (itemsError) throw itemsError;
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
