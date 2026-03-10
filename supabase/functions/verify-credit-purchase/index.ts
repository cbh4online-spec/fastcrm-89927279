import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CREDIT-PURCHASE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    logStep("User authenticated", { userId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, paymentIntent: session.payment_intent });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, message: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const metadata = session.metadata || {};
    if (metadata.type !== "credit_purchase") {
      throw new Error("Invalid session type");
    }

    const workspaceId = metadata.workspace_id;
    const packageId = metadata.package_id;
    const creditsAmount = parseInt(metadata.credits_amount, 10);
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as { id: string })?.id || sessionId;

    // Idempotency: check if already processed
    const { data: existingPurchase } = await supabase
      .from("credit_purchases")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingPurchase) {
      logStep("Already processed", { purchaseId: existingPurchase.id });
      return new Response(JSON.stringify({ success: true, already_processed: true, credits: creditsAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Insert purchase record
    const { error: purchaseError } = await supabase.from("credit_purchases").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      package_id: packageId,
      credits_amount: creditsAmount,
      amount_paid: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || "EUR",
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      status: "completed",
    });

    if (purchaseError) {
      logStep("Purchase insert error", purchaseError);
      throw new Error("Failed to record purchase");
    }

    // Upsert wallet balance
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("id, balance")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("credit_wallets")
        .update({ balance: wallet.balance + creditsAmount })
        .eq("id", wallet.id);
    } else {
      await supabase.from("credit_wallets").insert({
        workspace_id: workspaceId,
        balance: creditsAmount,
        reserved_balance: 0,
      });
    }

    // Record in ledger
    await supabase.from("credit_ledger").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action_key: "credit_purchase",
      module: "billing",
      credits_amount: creditsAmount,
      direction: "credit",
      status: "completed",
      description: `Compra de ${creditsAmount} créditos`,
      reference_type: "purchase",
      reference_id: packageId,
      metadata: { stripe_session_id: sessionId, payment_intent_id: paymentIntentId },
    });

    logStep("Purchase completed", { credits: creditsAmount, workspaceId });

    return new Response(JSON.stringify({ success: true, credits: creditsAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
