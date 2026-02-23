import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { runId } = await req.json();
    if (!runId) throw new Error("Missing runId");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: run } = await supabase
      .from("b2b_subscription_runs")
      .select("*, plan:b2b_subscription_plans(*, items:b2b_subscription_plan_items(*, product:products(id, name, base_price)))")
      .eq("id", runId)
      .single();

    if (!run || !run.plan) throw new Error("Run not found");

    // Create or find Stripe customer for this company
    // For now, create a simple invoice
    const invoice = await stripe.invoices.create({
      auto_advance: true,
      collection_method: "send_invoice",
      days_until_due: 30,
      description: `Plano de Manutenção: ${run.plan.name}`,
    });

    for (const item of (run.plan.items || [])) {
      const price = item.price_override ?? item.product?.base_price ?? 0;
      await stripe.invoiceItems.create({
        invoice: invoice.id,
        quantity: item.qty,
        unit_amount: Math.round(price * 100),
        currency: "eur",
        description: item.product?.name || "Produto",
      });
    }

    await stripe.invoices.finalizeInvoice(invoice.id);

    // Update run
    await supabase
      .from("b2b_subscription_runs")
      .update({ status: "invoiced", invoice_id: invoice.id })
      .eq("id", runId);

    return new Response(JSON.stringify({ invoiceId: invoice.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
