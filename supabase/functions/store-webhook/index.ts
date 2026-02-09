import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    logStep("Webhook received", { signaturePresent: !!signature });

    // We need to determine which workspace this webhook belongs to
    // Parse the event without verification first to get workspace_id from metadata
    const unverifiedEvent = JSON.parse(body);
    const sessionData = unverifiedEvent.data?.object;
    const workspaceId = sessionData?.metadata?.workspace_id;

    if (!workspaceId) {
      logStep("No workspace_id in metadata, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Workspace identified", { workspaceId });

    // Get workspace Stripe config to verify signature
    const { data: stripeConfig } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, stripe_webhook_secret_encrypted")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (!stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe not configured for workspace");
    }

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, {
      apiVersion: "2025-08-27.basil",
    });

    // Verify webhook signature if secret is configured
    let event: Stripe.Event;
    if (stripeConfig.stripe_webhook_secret_encrypted) {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeConfig.stripe_webhook_secret_encrypted
      );
      logStep("Webhook signature verified");
    } else {
      event = unverifiedEvent as Stripe.Event;
      logStep("No webhook secret configured, using unverified event");
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id, paymentStatus: session.payment_status });

      if (session.payment_status === "paid") {
        // Update store order
        const { data: order, error: updateError } = await supabaseClient
          .from("store_orders")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
            shipping_address: session.shipping_details?.address ? {
              name: session.shipping_details.name,
              line1: session.shipping_details.address.line1,
              line2: session.shipping_details.address.line2,
              city: session.shipping_details.address.city,
              state: session.shipping_details.address.state,
              postal_code: session.shipping_details.address.postal_code,
              country: session.shipping_details.address.country,
            } : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id)
          .select()
          .single();

        if (updateError) {
          logStep("Order update error", { message: updateError.message });
        } else {
          logStep("Order marked as paid", { orderId: order?.id });

          // Send emails
          try {
            const resendKey = Deno.env.get("RESEND_API_KEY");
            if (resendKey && order) {
              const resend = new Resend(resendKey);

              const items = (order.items as Array<{ name: string; quantity: number; unit_price: number }>) || [];
              const itemsHtml = items.map(i =>
                `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">€${(i.unit_price * i.quantity).toFixed(2)}</td></tr>`
              ).join("");

              // Customer confirmation email
              await resend.emails.send({
                from: "Loja <noreply@updates.fastcrm.pt>",
                to: [order.customer_email],
                subject: `Confirmação de encomenda${order.order_number ? ` #${order.order_number}` : ""}`,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                    <h1 style="color:#333">Obrigado pela sua compra!</h1>
                    <p>Olá ${order.customer_name},</p>
                    <p>A sua encomenda foi confirmada com sucesso.</p>
                    <table style="width:100%;border-collapse:collapse;margin:20px 0">
                      <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Produto</th><th style="padding:8px;text-align:center">Qtd</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
                      <tbody>${itemsHtml}</tbody>
                      <tfoot><tr><td colspan="2" style="padding:12px 8px;font-weight:bold">Total</td><td style="padding:12px 8px;text-align:right;font-weight:bold">€${order.total?.toFixed(2)}</td></tr></tfoot>
                    </table>
                    <p style="color:#666;font-size:14px">Receberá mais informações quando a sua encomenda for enviada.</p>
                  </div>
                `,
              });
              logStep("Customer confirmation email sent");

              // Admin notification
              const { data: storeSettings } = await supabaseClient
                .from("store_settings")
                .select("notification_email")
                .eq("workspace_id", workspaceId)
                .single();

              if (storeSettings?.notification_email) {
                await resend.emails.send({
                  from: "Loja <noreply@updates.fastcrm.pt>",
                  to: [storeSettings.notification_email],
                  subject: `Nova encomenda${order.order_number ? ` #${order.order_number}` : ""} — €${order.total?.toFixed(2)}`,
                  html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                      <h1 style="color:#333">Nova Encomenda Recebida!</h1>
                      <p><strong>Cliente:</strong> ${order.customer_name} (${order.customer_email})</p>
                      <p><strong>Total:</strong> €${order.total?.toFixed(2)}</p>
                      <p><strong>Itens:</strong> ${items.length}</p>
                      <table style="width:100%;border-collapse:collapse;margin:20px 0">
                        <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Produto</th><th style="padding:8px;text-align:center">Qtd</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                      </table>
                    </div>
                  `,
                });
                logStep("Admin notification email sent");
              }
            }
          } catch (emailError) {
            logStep("Email sending error (non-blocking)", { message: (emailError as Error).message });
          }
        }
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      logStep("Payment failed", { intentId: intent.id });
      // We could update order status but the session ID isn't directly available
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
