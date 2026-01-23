import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

interface WorkspaceStripeConfig {
  stripe_secret_key_encrypted: string;
  stripe_webhook_secret_encrypted: string | null;
  is_active: boolean;
}

interface SubscriptionRow {
  id: string;
  workspace_id: string;
  opportunity_id: string | null;
  frequency: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
}

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

// Helper to get workspace Stripe config by workspace ID
async function getWorkspaceStripeConfig(
  supabase: SupabaseClient, 
  workspaceId: string
): Promise<WorkspaceStripeConfig | null> {
  const { data, error } = await supabase
    .from("workspace_stripe_config")
    .select("stripe_secret_key_encrypted, stripe_webhook_secret_encrypted, is_active")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as WorkspaceStripeConfig;
}

// Helper to find workspace by subscription metadata or customer
async function findWorkspaceFromEvent(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<{ workspaceId: string; stripeConfig: WorkspaceStripeConfig } | null> {
  // Try to get workspace from subscription metadata
  const eventObject = event.data.object as { 
    metadata?: { workspace_id?: string }; 
    subscription?: string | Stripe.Subscription 
  };
  
  // Check event object metadata first
  if (eventObject.metadata?.workspace_id) {
    const config = await getWorkspaceStripeConfig(supabase, eventObject.metadata.workspace_id);
    if (config) {
      return { 
        workspaceId: eventObject.metadata.workspace_id, 
        stripeConfig: config
      };
    }
  }

  // If it's an invoice, check the subscription metadata
  if (eventObject.subscription) {
    const subId = typeof eventObject.subscription === "string" 
      ? eventObject.subscription 
      : eventObject.subscription.id;
    
    // Find subscription in our database
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("workspace_id")
      .eq("stripe_subscription_id", subId)
      .maybeSingle();

    if (subscription) {
      const sub = subscription as { workspace_id: string };
      const config = await getWorkspaceStripeConfig(supabase, sub.workspace_id);
      if (config) {
        return { 
          workspaceId: sub.workspace_id, 
          stripeConfig: config
        };
      }
    }
  }

  return null;
}

serve(async (req) => {
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

    // First, parse the event without verification to get workspace info
    const rawEvent = JSON.parse(body) as Stripe.Event;
    logStep("Received raw event", { type: rawEvent.type, id: rawEvent.id });

    // Find the workspace and its Stripe config
    const workspaceInfo = await findWorkspaceFromEvent(supabase, rawEvent);
    
    if (!workspaceInfo) {
      logStep("Could not determine workspace for event, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { workspaceId, stripeConfig } = workspaceInfo;
    logStep("Found workspace", { workspaceId });

    // Now verify the webhook signature with workspace's secret
    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, { 
      apiVersion: "2025-08-27.basil" 
    });

    let event: Stripe.Event;
    if (stripeConfig.stripe_webhook_secret_encrypted) {
      event = stripe.webhooks.constructEvent(
        body, 
        signature, 
        stripeConfig.stripe_webhook_secret_encrypted
      );
    } else {
      // For development without webhook secret
      event = rawEvent;
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Helper to find subscription by stripe_subscription_id
    const findSubscription = async (stripeSubscriptionId: string): Promise<SubscriptionRow | null> => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, workspace_id, opportunity_id, frequency, stripe_subscription_id, stripe_price_id")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return data as SubscriptionRow | null;
    };

    // Helper to find subscription by Stripe customer email
    const findSubscriptionByCustomer = async (customerId: string): Promise<SubscriptionRow | null> => {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;

      const email = (customer as Stripe.Customer).email;
      if (!email) return null;

      // Find contact with this email in the workspace
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", email)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (contact) {
        const contactData = contact as { id: string };
        const { data } = await supabase
          .from("subscriptions")
          .select("id, workspace_id, opportunity_id, frequency, stripe_subscription_id, stripe_price_id")
          .eq("contact_id", contactData.id)
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as SubscriptionRow | null;
      }

      return null;
    };

    // Helper to create subscription event
    const createSubscriptionEvent = async (
      subscriptionId: string,
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
            "payment_succeeded",
            amount,
            `Pagamento Stripe: €${amount.toFixed(2)}`,
            { stripe_invoice_id: invoice.id, stripe_event_id: event.id }
          );

          logStep("Payment succeeded processed", { subscriptionId: subscription.id, amount });
        }
        break;
      }

      // Payment failed - mark as past_due, create task + notification
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const stripeSubId = typeof invoice.subscription === "string" 
          ? invoice.subscription 
          : invoice.subscription.id;

        const subscription = await findSubscription(stripeSubId);

        if (subscription) {
          const amount = (invoice.amount_due || 0) / 100;

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
            "payment_failed",
            amount,
            "Falha no pagamento Stripe",
            { stripe_invoice_id: invoice.id, stripe_event_id: event.id }
          );

          // Create task for follow-up
          const { data: subDetails } = await supabase
            .from("subscriptions")
            .select("contact:contacts(name), company:companies(name)")
            .eq("id", subscription.id)
            .single();

          type SubDetailsResult = { contact: { name: string }[] | null; company: { name: string }[] | null } | null;
          const details = subDetails as SubDetailsResult;
          const customerName = details?.company?.[0]?.name 
            || details?.contact?.[0]?.name 
            || "Cliente";

          await supabase.from("tasks").insert({
            workspace_id: workspaceId,
            title: `Falha de pagamento - ${customerName}`,
            description: `O pagamento de €${amount.toFixed(2)} falhou. Contactar cliente para regularização.`,
            entity_type: "subscription",
            entity_id: subscription.id,
            priority: "high",
            status: "todo",
            due_at: new Date().toISOString(),
          });

          // Create notification
          await supabase.from("notifications").insert({
            workspace_id: workspaceId,
            title: "Falha de Pagamento",
            message: `Pagamento de €${amount.toFixed(2)} falhou para ${customerName}. Subscrição marcada como past_due.`,
            notification_type: "payment_failed",
            priority: "high",
            data: { subscription_id: subscription.id, amount },
          });

          logStep("Payment failed processed with task and notification", { subscriptionId: subscription.id });
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
            "canceled",
            undefined,
            "Subscrição cancelada via Stripe",
            { stripe_subscription_id: stripeSubscription.id, stripe_event_id: event.id }
          );

          logStep("Subscription canceled processed", { subscriptionId: subscription.id });
        }
        break;
      }

      // Subscription paused
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
                workspace_id: workspaceId,
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
