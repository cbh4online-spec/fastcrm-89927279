import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { proposalId, customerEmail } = await req.json();
    if (!proposalId) throw new Error("Proposal ID is required");

    // Get proposal
    const { data: proposal, error: proposalError } = await supabaseClient
      .from("proposals")
      .select("*, opportunity:opportunities(id, title, lead:leads(name, email))")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) throw new Error("Proposal not found");
    if (proposal.status !== "published") throw new Error("Proposal not published");
    if (!proposal.price) throw new Error("Proposal has no price");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const email = customerEmail || proposal.opportunity?.lead?.email;
    let customerId: string | undefined;

    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Create one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{
        price_data: {
          currency: proposal.currency?.toLowerCase() || "brl",
          product_data: {
            name: proposal.title,
            description: `Proposta para ${proposal.opportunity?.lead?.name || "Cliente"}`,
          },
          unit_amount: Math.round(proposal.price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/p/${proposal.slug}?payment=success`,
      cancel_url: `${req.headers.get("origin")}/p/${proposal.slug}?payment=canceled`,
      metadata: {
        proposal_id: proposalId,
        opportunity_id: proposal.opportunity_id,
        workspace_id: proposal.workspace_id,
      },
    });

    // Update proposal with checkout session
    await supabaseClient
      .from("proposals")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: "pending",
      })
      .eq("id", proposalId);

    // Log activity
    await supabaseClient.from("proposal_activity_logs").insert({
      proposal_id: proposalId,
      workspace_id: proposal.workspace_id,
      action: "checkout_started",
      details: { session_id: session.id },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
