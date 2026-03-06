import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { runId } = await req.json();
    if (!runId) throw new Error("Missing runId");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: run } = await supabase
      .from("b2b_subscription_runs")
      .select("*, plan:b2b_subscription_plans(*, items:b2b_subscription_plan_items(*, product:products(id, name, base_price, sku, images)))")
      .eq("id", runId)
      .single();

    if (!run || !run.plan) throw new Error("Run not found");

    const plan = run.plan;
    console.log(`[ORDERS] B2B plan order: run=${runId}, plan=${plan.name}`);

    const year = new Date().getFullYear();
    const orderNumber = `NE-${year}-PLAN-${Date.now()}`;

    // Create order_note
    const { data: order, error: orderErr } = await supabase
      .from("order_notes")
      .insert({
        workspace_id: plan.workspace_id,
        order_number: orderNumber,
        status: "submitted",
        total_net: run.amount || 0,
        total_vat: (run.amount || 0) * 0.23,
        total_gross: (run.amount || 0) * 1.23,
        client_notes: `Gerado automaticamente pelo plano "${plan.name}"`,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order items
    const items = (plan.items || []).map((it: any, i: number) => ({
      order_note_id: order.id,
      workspace_id: plan.workspace_id,
      product_id: it.product_id,
      product_name: it.product?.name || "Produto",
      product_sku: it.product?.sku || null,
      product_image_url: it.product?.images?.[0] || null,
      quantity: it.qty,
      unit_price_net: it.price_override ?? it.product?.base_price ?? 0,
      vat_rate: 23,
      position: i,
    }));

    if (items.length > 0) {
      await supabase.from("order_note_items").insert(items);
    }

    // Update run
    await supabase
      .from("b2b_subscription_runs")
      .update({ status: "ordered", order_id: order.id })
      .eq("id", runId);

    console.log(`[ORDERS] B2B order created: id=${order.id}, number=${orderNumber}`);

    return new Response(JSON.stringify({ orderId: order.id, orderNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ORDERS] B2B_PLAN_ORDER_FAILED", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
