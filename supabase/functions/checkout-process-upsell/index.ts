import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { sessionId, offerId, accepted, workspaceId } = await req.json();

    if (!sessionId || !offerId || !workspaceId) throw new Error("Missing required fields");

    // Get session
    const { data: session } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    // Get offer
    const { data: offer } = await supabase
      .from("checkout_offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (!offer) throw new Error("Offer not found");

    const updatedUpsellsShown = [...(session.upsells_shown || []), offerId];
    const updatedUpsellsAccepted = accepted
      ? [...(session.upsells_accepted || []), offerId]
      : session.upsells_accepted || [];

    if (accepted) {
      // Get workspace Stripe config
      const { data: stripeConfig } = await supabase
        .from("workspace_stripe_config")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .single();

      const upsellStripeKey = stripeConfig?.stripe_secret_key_encrypted || Deno.env.get("STRIPE_SECRET_KEY");
      if (!upsellStripeKey) {
        throw new Error("Pagamentos indisponíveis: Stripe não configurado.");
      }

      const stripe = new Stripe(upsellStripeKey, { apiVersion: "2025-08-27.basil" });

      // Try one-click charge if we have payment method
      if (session.stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(session.stripe_payment_intent_id);
        if (pi.payment_method) {
          await stripe.paymentIntents.create({
            amount: Math.round(offer.price * 100),
            currency: (offer.currency || "EUR").toLowerCase(),
            customer: pi.customer as string,
            payment_method: pi.payment_method as string,
            off_session: true,
            confirm: true,
            metadata: {
              checkout_session_id: sessionId,
              offer_id: offerId,
              type: "upsell",
            },
          });
        }
      }

      // Update total
      const newTotal = (session.total_value || 0) + offer.price;
      await supabase
        .from("checkout_sessions")
        .update({
          upsells_shown: updatedUpsellsShown,
          upsells_accepted: updatedUpsellsAccepted,
          total_value: newTotal,
          status: "upsell_accepted",
        })
        .eq("id", sessionId);
    } else {
      await supabase
        .from("checkout_sessions")
        .update({
          upsells_shown: updatedUpsellsShown,
          status: "upsell_declined",
        })
        .eq("id", sessionId);
    }

    // Determine next step
    const { data: sequences } = await supabase
      .from("checkout_offer_sequences")
      .select("*")
      .eq("offer_id", offerId)
      .eq("workspace_id", workspaceId);

    const seq = sequences?.[0];
    let nextOfferId = null;
    if (seq) {
      nextOfferId = accepted ? seq.on_accept_next_offer_id : seq.on_decline_next_offer_id;
    }

    // Get funnel slug for URL
    const { data: funnel } = await supabase
      .from("checkout_funnels")
      .select("slug")
      .eq("id", session.funnel_id)
      .single();

    let nextUrl: string;
    if (nextOfferId) {
      // Check if next offer is downsell type
      const { data: nextOffer } = await supabase
        .from("checkout_offers")
        .select("offer_type")
        .eq("id", nextOfferId)
        .single();

      const stepType = nextOffer?.offer_type === "downsell" ? "downsell" : "upsell";
      nextUrl = `/checkout/${funnel?.slug}/${stepType}/${nextOfferId}?session=${sessionId}`;
    } else {
      nextUrl = `/checkout/${funnel?.slug}/thank-you?session=${sessionId}`;
      await supabase
        .from("checkout_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({ nextUrl, accepted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
