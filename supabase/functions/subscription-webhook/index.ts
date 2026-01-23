import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

// Map billing frequency from Stripe interval
function mapBillingFrequency(interval: string): string {
  const map: Record<string, string> = {
    week: "weekly",
    month: "monthly",
    quarter: "quarterly",
    year: "yearly",
  };
  return map[interval] || "monthly";
}

// Calculate next payment date based on frequency
function calculateNextPaymentDate(frequency: string, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "semi_annual":
      date.setMonth(date.getMonth() + 6);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date;
}

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Received event", { type: event.type, id: event.id });

    // Helper to find subscription by stripe_subscription_id
    const findSubscription = async (stripeSubscriptionId: string) => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();
      return data;
    };

    // Helper to find subscription by Stripe customer email
    const findSubscriptionByCustomer = async (customerId: string) => {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;

      const email = (customer as Stripe.Customer).email;
      if (!email) return null;

      // Find contact or company with this email
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, workspace_id")
        .eq("email", email)
        .maybeSingle();

      if (contact) {
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("contact_id", contact.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      }

      return null;
    };

    // Helper to create subscription event
    const createSubscriptionEvent = async (
      subscriptionId: string,
      workspaceId: string,
      eventType: string,
      amount?: number,
      notes?: string,
      rawPayload?: unknown
    ) => {
      await supabase.from("subscription_events").insert({
        subscription_id: subscriptionId,
        workspace_id: workspaceId,
        event_type: eventType,
        amount: amount || null,
        currency: "EUR",
        occurred_at: new Date().toISOString(),
        notes: notes || null,
        raw_payload: rawPayload || null,
      });
      logStep("Created subscription event", { subscriptionId, eventType });
    };

    switch (event.type) {
      // Payment successful - update subscription and create event
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const stripeSubId = typeof invoice.subscription === "string" 
          ? invoice.subscription 
          : invoice.subscription.id;

        let subscription = await findSubscription(stripeSubId);
        
        // Try to find by customer if not found by subscription ID
        if (!subscription && invoice.customer) {
          const customerId = typeof invoice.customer === "string" 
            ? invoice.customer 
            : invoice.customer.id;
          subscription = await findSubscriptionByCustomer(customerId);
        }

        if (subscription) {
          const amount = (invoice.amount_paid || 0) / 100;
          const now = new Date();
          const nextPayment = calculateNextPaymentDate(subscription.frequency, now);

          // Update subscription
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              last_payment_date: now.toISOString(),
              next_payment_date: nextPayment.toISOString(),
              stripe_subscription_id: stripeSubId,
            })
            .eq("id", subscription.id);

          // Update opportunity if linked
          if (subscription.opportunity_id) {
            await supabase
              .from("opportunities")
              .update({
                subscription_status: "active",
                last_payment_date: now.toISOString(),
                next_payment_date: nextPayment.toISOString(),
              })
              .eq("id", subscription.opportunity_id);
          }

          // Create subscription event
          await createSubscriptionEvent(
            subscription.id,
            subscription.workspace_id,
            "payment_succeeded",
            amount,
            `Pagamento Stripe: €${amount.toFixed(2)}`,
            { stripe_invoice_id: invoice.id, stripe_event_id: event.id }
          );

          logStep("Payment succeeded processed", { subscriptionId: subscription.id, amount });
        }
        break;
      }

      // Payment failed - mark as past_due
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const stripeSubId = typeof invoice.subscription === "string" 
          ? invoice.subscription 
          : invoice.subscription.id;

        const subscription = await findSubscription(stripeSubId);

        if (subscription) {
          // Update subscription status
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("id", subscription.id);

          // Update opportunity if linked
          if (subscription.opportunity_id) {
            await supabase
              .from("opportunities")
              .update({ subscription_status: "past_due" })
              .eq("id", subscription.opportunity_id);
          }

          // Create subscription event
          await createSubscriptionEvent(
            subscription.id,
            subscription.workspace_id,
            "payment_failed",
            (invoice.amount_due || 0) / 100,
            "Falha no pagamento Stripe",
            { stripe_invoice_id: invoice.id, stripe_event_id: event.id }
          );

          logStep("Payment failed processed", { subscriptionId: subscription.id });
        }
        break;
      }

      // Subscription canceled
      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const subscription = await findSubscription(stripeSubscription.id);

        if (subscription) {
          // Update subscription status
          await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
              canceled_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          // Update opportunity if linked
          if (subscription.opportunity_id) {
            await supabase
              .from("opportunities")
              .update({ subscription_status: "cancelled" })
              .eq("id", subscription.opportunity_id);
          }

          // Create subscription event
          await createSubscriptionEvent(
            subscription.id,
            subscription.workspace_id,
            "canceled",
            undefined,
            "Subscrição cancelada via Stripe",
            { stripe_subscription_id: stripeSubscription.id, stripe_event_id: event.id }
          );

          logStep("Subscription canceled processed", { subscriptionId: subscription.id });
        }
        break;
      }

      // Subscription paused (via Stripe pause collection)
      case "customer.subscription.paused": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const subscription = await findSubscription(stripeSubscription.id);

        if (subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "paused" })
            .eq("id", subscription.id);

          if (subscription.opportunity_id) {
            await supabase
              .from("opportunities")
              .update({ subscription_status: "paused" })
              .eq("id", subscription.opportunity_id);
          }

          await createSubscriptionEvent(
            subscription.id,
            subscription.workspace_id,
            "paused",
            undefined,
            "Subscrição pausada via Stripe",
            { stripe_event_id: event.id }
          );

          logStep("Subscription paused processed", { subscriptionId: subscription.id });
        }
        break;
      }

      // Subscription resumed
      case "customer.subscription.resumed": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const subscription = await findSubscription(stripeSubscription.id);

        if (subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("id", subscription.id);

          if (subscription.opportunity_id) {
            await supabase
              .from("opportunities")
              .update({ subscription_status: "active" })
              .eq("id", subscription.opportunity_id);
          }

          await createSubscriptionEvent(
            subscription.id,
            subscription.workspace_id,
            "resumed",
            undefined,
            "Subscrição retomada via Stripe",
            { stripe_event_id: event.id }
          );

          logStep("Subscription resumed processed", { subscriptionId: subscription.id });
        }
        break;
      }

      // Plan changed (subscription updated)
      case "customer.subscription.updated": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        
        // Only process if price changed (plan change)
        if (!previousAttributes?.items) break;

        const subscription = await findSubscription(stripeSubscription.id);

        if (subscription) {
          const newPrice = stripeSubscription.items.data[0]?.price;
          const oldPrice = previousAttributes.items?.data?.[0]?.price;

          if (newPrice && oldPrice) {
            const newAmount = (newPrice.unit_amount || 0) / 100;
            const oldAmount = (oldPrice.unit_amount || 0) / 100;
            const isUpsell = newAmount > oldAmount;

            // Update subscription with new values
            await supabase
              .from("subscriptions")
              .update({
                mrr_amount: newAmount,
                frequency: mapBillingFrequency(newPrice.recurring?.interval || "month"),
                stripe_price_id: newPrice.id,
              })
              .eq("id", subscription.id);

            // Create plan_changed event
            await createSubscriptionEvent(
              subscription.id,
              subscription.workspace_id,
              "plan_changed",
              newAmount,
              isUpsell 
                ? `Upgrade: €${oldAmount.toFixed(2)} → €${newAmount.toFixed(2)}`
                : `Downgrade: €${oldAmount.toFixed(2)} → €${newAmount.toFixed(2)}`,
              { 
                old_price: oldAmount, 
                new_price: newAmount, 
                is_upsell: isUpsell,
                stripe_event_id: event.id 
              }
            );

            // If upsell, create task to potentially create upsell opportunity
            if (isUpsell && subscription.opportunity_id) {
              await supabase.from("tasks").insert({
                workspace_id: subscription.workspace_id,
                title: "Upsell realizado - Verificar criação de oportunidade",
                description: `O cliente fez upgrade de €${oldAmount.toFixed(2)} para €${newAmount.toFixed(2)}. Considere criar uma oportunidade de upsell para rastreamento.`,
                entity_type: "opportunity",
                entity_id: subscription.opportunity_id,
                priority: "medium",
                status: "todo",
              });
            }

            logStep("Plan changed processed", { 
              subscriptionId: subscription.id, 
              oldAmount, 
              newAmount, 
              isUpsell 
            });
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
