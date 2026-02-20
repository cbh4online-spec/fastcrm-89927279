import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Process digital deliverables after payment
async function processDeliverables(
  supabaseClient: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  workspaceId: string
) {
  const orderItems = order.items as Array<{ product_id: string; quantity: number }>;
  const productIds = orderItems.map(i => i.product_id);

  // Fetch deliverables for all products in the order
  const { data: deliverables } = await supabaseClient
    .from("product_deliverables")
    .select("*")
    .in("product_id", productIds)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("sort_order");

  if (!deliverables || deliverables.length === 0) {
    logStep("No deliverables to process");
    return;
  }

  logStep("Processing deliverables", { count: deliverables.length });

  for (const deliverable of deliverables) {
    const config = deliverable.config as Record<string, unknown>;
    let status = "delivered";
    let deliveryData: Record<string, unknown> = {};
    let errorMessage: string | null = null;

    try {
      switch (deliverable.deliverable_type) {
        case "file": {
          // Generate a signed URL for the file
          const storagePath = config.storage_path as string;
          if (storagePath) {
            const { data: signedUrl } = await supabaseClient.storage
              .from("product-deliverables")
              .createSignedUrl(storagePath, 7 * 24 * 60 * 60); // 7 days
            deliveryData = { download_url: signedUrl?.signedUrl, file_name: config.file_name, expires_in: "7 days" };
          }
          break;
        }
        case "portal_access": {
          // Activate entitlements for the contact
          const entitlementIds = config.entitlement_ids as string[] || [];
          const contactId = order.contact_id as string;
          if (contactId && entitlementIds.length > 0) {
            // Find client user for this contact
            const { data: clientUser } = await supabaseClient
              .from("client_users")
              .select("id")
              .eq("contact_id", contactId)
              .eq("workspace_id", workspaceId)
              .maybeSingle();

            if (clientUser) {
              for (const entId of entitlementIds) {
                await supabaseClient.from("client_entitlements").upsert({
                  client_user_id: clientUser.id,
                  workspace_id: workspaceId,
                  entitlement_type: "product_access",
                  entitlement_key: entId,
                  is_active: true,
                  granted_by: "store_purchase",
                  metadata: { order_id: order.id, product_id: deliverable.product_id },
                }, { onConflict: "client_user_id,entitlement_key" });
              }
              deliveryData = { entitlements_activated: entitlementIds, client_user_id: clientUser.id };
            } else {
              deliveryData = { note: "No client user found for contact, entitlements queued" };
            }
          }
          break;
        }
        case "course_enrollment": {
          // Enroll contact in SJ course
          const courseId = config.course_id as string;
          const cohortId = config.cohort_id as string | null;
          const contactId = order.contact_id as string;
          if (courseId && contactId) {
            // Find SJ profile for this contact
            const { data: sjProfile } = await supabaseClient
              .from("sj_profiles")
              .select("id")
              .eq("contact_id", contactId)
              .eq("workspace_id", workspaceId)
              .maybeSingle();

            if (sjProfile) {
              const { data: enrollment, error: enrollErr } = await supabaseClient
                .from("sj_enrollments")
                .insert({
                  profile_id: sjProfile.id,
                  course_id: courseId,
                  cohort_id: cohortId || null,
                  workspace_id: workspaceId,
                  status: "active",
                  source: "store_purchase",
                })
                .select("id")
                .single();
              if (enrollErr) throw enrollErr;
              deliveryData = { enrollment_id: enrollment?.id, course_id: courseId };
            } else {
              deliveryData = { note: "No SJ profile found for contact" };
              status = "pending";
            }
          }
          break;
        }
        case "license_key": {
          // Generate a license key
          const prefix = (config.prefix as string) || "LIC";
          const key = `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          deliveryData = { license_key: key, max_activations: config.max_activations || 1 };
          break;
        }
      }
    } catch (err) {
      status = "failed";
      errorMessage = (err as Error).message;
      logStep("Deliverable processing failed", { deliverableId: deliverable.id, error: errorMessage });
    }

    // Record delivery
    await supabaseClient.from("order_deliveries").insert({
      order_id: order.id,
      deliverable_id: deliverable.id,
      workspace_id: workspaceId,
      status,
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
      delivery_data: deliveryData,
      error_message: errorMessage,
    });

    logStep("Deliverable recorded", { deliverableId: deliverable.id, type: deliverable.deliverable_type, status });
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
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

          // Decrement stock for tracked products
          if (order?.items) {
            const orderItems = order.items as Array<{ product_id: string; quantity: number }>;
            for (const item of orderItems) {
              const { data: prod } = await supabaseClient
                .from("products")
                .select("stock_quantity, track_stock")
                .eq("id", item.product_id)
                .single();
              
              if (prod?.track_stock && prod.stock_quantity !== null) {
                const newQty = Math.max(0, prod.stock_quantity - item.quantity);
                await supabaseClient
                  .from("products")
                  .update({ stock_quantity: newQty, stock_status: newQty === 0 ? "out_of_stock" : "in_stock" })
                  .eq("id", item.product_id);
              }
            }
            logStep("Stock decremented for tracked products");
          }

          // Process digital deliverables
          if (order?.items && order?.id) {
            try {
              await processDeliverables(supabaseClient, order, workspaceId);
            } catch (deliveryError) {
              logStep("Delivery processing error (non-blocking)", { message: (deliveryError as Error).message });
            }
          }
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

          // ============================
          // Store Automation Triggers
          // ============================
          try {
            // Check if this is a first purchase or repurchase
            const contactId = order?.contact_id;
            let eventType = 'purchase_completed';

            if (contactId) {
              const { count: previousOrders } = await supabaseClient
                .from('store_orders')
                .select('id', { count: 'exact', head: true })
                .eq('contact_id', contactId)
                .eq('workspace_id', workspaceId)
                .in('status', ['paid', 'processing', 'shipped', 'delivered'])
                .neq('id', order.id);

              if (previousOrders === 0) {
                eventType = 'first_purchase';
                // Also log as first_purchase event
                await supabaseClient.from('store_automation_events').insert({
                  workspace_id: workspaceId,
                  event_type: 'first_purchase',
                  order_id: order.id,
                  contact_id: contactId,
                  event_data: {
                    order_number: order.order_number,
                    total: order.total,
                    items: order.items,
                    customer_email: order.customer_email,
                    customer_name: order.customer_name,
                  },
                });
              } else {
                eventType = 'repurchase';
                // Log repurchase event
                await supabaseClient.from('store_automation_events').insert({
                  workspace_id: workspaceId,
                  event_type: 'repurchase',
                  order_id: order.id,
                  contact_id: contactId,
                  event_data: {
                    order_number: order.order_number,
                    total: order.total,
                    items: order.items,
                    previous_orders: previousOrders,
                    customer_email: order.customer_email,
                  },
                });
              }
            }

            // Always log the general purchase_completed event
            await supabaseClient.from('store_automation_events').insert({
              workspace_id: workspaceId,
              event_type: 'purchase_completed',
              order_id: order.id,
              contact_id: contactId || null,
              event_data: {
                order_number: order.order_number,
                total: order.total,
                items: order.items,
                customer_email: order.customer_email,
                customer_name: order.customer_name,
                is_first_purchase: eventType === 'first_purchase',
                is_repurchase: eventType === 'repurchase',
              },
            });

            // Mark any abandoned cart as recovered (by session or email)
            if (order.customer_email) {
              await supabaseClient
                .from('store_abandoned_carts')
                .update({ recovery_status: 'recovered', recovered_order_id: order.id, updated_at: new Date().toISOString() })
                .eq('workspace_id', workspaceId)
                .eq('customer_email', order.customer_email)
                .in('recovery_status', ['abandoned', 'contacted']);
            }
            if (order.contact_id) {
              await supabaseClient
                .from('store_abandoned_carts')
                .update({ recovery_status: 'recovered', recovered_order_id: order.id, updated_at: new Date().toISOString() })
                .eq('workspace_id', workspaceId)
                .eq('contact_id', order.contact_id)
                .in('recovery_status', ['abandoned', 'contacted']);
            }

            logStep('Store automation events logged', { eventType });
          } catch (automationError) {
            logStep('Store automation event error (non-blocking)', { message: (automationError as Error).message });
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
