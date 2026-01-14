import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_PROPOSAL_WEBHOOK_SECRET");

    let event: Stripe.Event;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log(`[PROPOSAL-WEBHOOK] Event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const proposalId = session.metadata?.proposal_id;
      const opportunityId = session.metadata?.opportunity_id;
      const workspaceId = session.metadata?.workspace_id;

      if (proposalId) {
        // Update proposal
        await supabaseClient
          .from("proposals")
          .update({
            status: "accepted",
            payment_status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
            accepted_at: new Date().toISOString(),
          })
          .eq("id", proposalId);

        // Update opportunity to won
        if (opportunityId) {
          await supabaseClient
            .from("opportunities")
            .update({ status: "won" })
            .eq("id", opportunityId);
        }

        // Log activity
        if (workspaceId) {
          await supabaseClient.from("proposal_activity_logs").insert({
            proposal_id: proposalId,
            workspace_id: workspaceId,
            action: "payment_completed",
            details: {
              amount: session.amount_total,
              currency: session.currency,
              payment_intent: session.payment_intent,
            },
          });
        }

        console.log(`[PROPOSAL-WEBHOOK] Proposal ${proposalId} accepted`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PROPOSAL-WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
