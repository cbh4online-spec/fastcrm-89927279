import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[C2C-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.text();
    const event = JSON.parse(body) as Stripe.Event;
    logStep("Event received", { type: event.type, id: event.id });

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const type = metadata.type;
    logStep("Processing session", { sessionId: session.id, type, metadata });

    // ── C2C Boost Payment ──
    if (type === "c2c_boost") {
      const { error } = await supabase
        .from("c2c_sponsored_listings")
        .update({ is_active: true })
        .eq("stripe_payment_id", session.id);
      
      if (error) logStep("Error activating boost", { error: error.message });
      else logStep("Boost activated", { sessionId: session.id });
    }

    // ── C2C Premium Subscription ──
    if (type === "c2c_premium") {
      const startsAt = new Date();
      const endsAt = new Date(startsAt);
      endsAt.setMonth(endsAt.getMonth() + 1);

      const { error } = await supabase
        .from("c2c_seller_subscriptions")
        .update({
          status: "active",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .eq("stripe_subscription_id", session.id);

      if (error) logStep("Error activating premium", { error: error.message });
      else {
        logStep("Premium activated", { sessionId: session.id });
        // Update seller commission rate to 3%
        if (metadata.seller_id) {
          await supabase
            .from("c2c_sellers")
            .update({ commission_rate: 3.0 })
            .eq("id", metadata.seller_id);
        }
      }
    }

    // ── Sponsor Payment ──
    if (type === "sponsor") {
      const applicationId = metadata.application_id;
      if (applicationId) {
        const startsAt = new Date();
        const endsAt = new Date(startsAt);
        endsAt.setMonth(endsAt.getMonth() + 1);

        const { error } = await supabase
          .from("sponsor_applications")
          .update({
            status: "active",
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
          })
          .eq("id", applicationId);

        if (error) logStep("Error activating sponsor", { error: error.message });
        else {
          logStep("Sponsor activated", { applicationId });

          // Auto-create store_sponsors entry
          const { data: app } = await supabase
            .from("sponsor_applications")
            .select("*")
            .eq("id", applicationId)
            .single();

          if (app) {
            await supabase.from("store_sponsors").upsert({
              workspace_id: app.workspace_id,
              name: app.company_name,
              logo_url: app.logo_url,
              website_url: app.website_url,
              description: app.description,
              tier: app.tier,
              is_active: true,
              sort_order: app.tier === "gold" ? 1 : app.tier === "silver" ? 2 : 3,
            }, { onConflict: "id" });
          }
        }
      }
    }

    // ── C2C Checkout (item sale) ──
    if (type === "c2c_purchase") {
      const listingId = metadata.listing_id;
      if (listingId) {
        // Mark listing as sold
        await supabase
          .from("c2c_listings")
          .update({ status: "sold" })
          .eq("id", listingId);

        // Update commission status
        await supabase
          .from("c2c_commissions")
          .update({ status: "pending" })
          .eq("listing_id", listingId)
          .eq("status", "pending");

        // Update seller stats
        if (metadata.seller_id) {
          const { data: seller } = await supabase
            .from("c2c_sellers")
            .select("total_sales, total_revenue")
            .eq("id", metadata.seller_id)
            .single();

          if (seller) {
            const saleAmount = parseFloat(metadata.sale_amount || "0");
            await supabase
              .from("c2c_sellers")
              .update({
                total_sales: (seller.total_sales || 0) + 1,
                total_revenue: (seller.total_revenue || 0) + saleAmount,
              })
              .eq("id", metadata.seller_id);
          }
        }

        logStep("C2C purchase completed", { listingId });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
