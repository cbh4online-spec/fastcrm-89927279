import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_RENEWAL_WEBHOOK_SECRET");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret) as Stripe.Event;
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`[RENEWAL-WEBHOOK] Event: ${event.type}, ID: ${event.id}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractId = session.metadata?.contract_id;
        const workspaceId = session.metadata?.workspace_id;

        if (!contractId || !workspaceId) {
          console.log("[RENEWAL-WEBHOOK] No contract metadata, skipping");
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        await db.from("renewal_contracts").update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          dunning_attempts: 0,
        }).eq("id", contractId);

        await db.from("renewal_payment_links")
          .update({ status: "paid" })
          .eq("stripe_session_id", session.id);

        await db.from("renewal_payment_events").insert({
          workspace_id: workspaceId,
          contract_id: contractId,
          stripe_event_id: event.id,
          event_type: "subscription_created",
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          stripe_subscription_id: subscriptionId,
          metadata: { session_id: session.id, customer_id: customerId },
        });

        await db.from("workspace_subscriptions").upsert({
          workspace_id: workspaceId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: "active",
          plan: "renewal_contract",
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" });

        console.log(`[RENEWAL-WEBHOOK] Subscription ${subscriptionId} linked to contract ${contractId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id, company_id, contact_id, total_mrr, currency, owner_user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) {
          console.log(`[RENEWAL-WEBHOOK] No contract for subscription ${subscriptionId}`);
          break;
        }

        // Record payment event
        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "payment_succeeded",
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency?.toUpperCase() || "EUR",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          metadata: { invoice_number: invoice.number, period_start: invoice.period_start, period_end: invoice.period_end },
        });

        // Reset dunning + activate contract
        await db.from("renewal_contracts")
          .update({ status: "active", risk_level: "low", dunning_attempts: 0 })
          .eq("id", contract.id);

        // --- Create invoice in billing module ---
        try {
          const amountPaid = (invoice.amount_paid || 0) / 100;
          const now = new Date().toISOString();
          const dateStr = now.split("T")[0].replace(/-/g, "");
          
          // Generate invoice number
          const { count } = await db.from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", contract.workspace_id)
            .like("invoice_number", `REN-${dateStr}%`);
          
          const seq = (count || 0) + 1;
          const invoiceNumber = `REN-${dateStr}-${String(seq).padStart(3, "0")}`;

          // Get company name for client_name
          let clientName = "—";
          let clientEmail = "";
          if (contract.company_id) {
            const { data: company } = await db.from("companies")
              .select("name").eq("id", contract.company_id).maybeSingle();
            if (company) clientName = company.name;
          }
          if (contract.contact_id) {
            const { data: contact } = await db.from("contacts")
              .select("email").eq("id", contract.contact_id).maybeSingle();
            if (contact) clientEmail = contact.email || "";
          }

          // Resolve a valid UUID for created_by
          let createdBy = contract.owner_user_id;
          if (!createdBy) {
            const { data: member } = await db.from("workspace_members")
              .select("user_id")
              .eq("workspace_id", contract.workspace_id)
              .limit(1)
              .maybeSingle();
            createdBy = member?.user_id || null;
          }

          if (!createdBy) {
            console.error("[RENEWAL-WEBHOOK] No valid user_id for created_by, skipping invoice creation");
            break;
          }

          const { data: newInvoice, error: invoiceInsertError } = await db.from("invoices").insert({
            workspace_id: contract.workspace_id,
            invoice_number: invoiceNumber,
            document_type: "invoice",
            client_name: clientName,
            client_email: clientEmail || null,
            company_id: contract.company_id,
            contact_id: contract.contact_id,
            renewal_contract_id: contract.id,
            created_by: createdBy,
            status: "paid",
            paid_at: now,
            issue_date: now.split("T")[0],
            due_date: now.split("T")[0],
            subtotal: amountPaid,
            tax_amount: 0,
            total: amountPaid,
            amount_paid: amountPaid,
            currency: contract.currency || "EUR",
            notes: `Pagamento automático Stripe. Invoice: ${invoice.id}`,
          }).select("id").maybeSingle();

          // Create invoice items from contract items
          if (newInvoice) {
            const { data: items } = await db.from("renewal_items")
              .select("name, qty, unit_price, product_id")
              .eq("contract_id", contract.id)
              .in("status", ["active", "pending_renewal"]);

            if (items && items.length > 0) {
              const invoiceItems = items.map((item: any, idx: number) => ({
                invoice_id: newInvoice.id,
                description: item.name,
                quantity: item.qty || 1,
                unit_price: Number(item.unit_price) || 0,
                total: (item.qty || 1) * (Number(item.unit_price) || 0),
                product_id: item.product_id,
                position: idx + 1,
              }));
              await db.from("invoice_items").insert(invoiceItems);
            }
          }

          console.log(`[RENEWAL-WEBHOOK] Invoice ${invoiceNumber} created for contract ${contract.id}`);
        } catch (invoiceErr) {
          console.error("[RENEWAL-WEBHOOK] Failed to create invoice:", invoiceErr);
        }

        console.log(`[RENEWAL-WEBHOOK] Payment recorded for contract ${contract.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id, dunning_attempts, stripe_subscription_id, company_id, contact_id, total_mrr, owner_user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) break;

        const currentAttempts = (contract.dunning_attempts || 0) + 1;

        // Escalate risk level based on attempts
        const riskLevel = currentAttempts === 1 ? "medium" : currentAttempts === 2 ? "high" : "critical";

        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "payment_failed",
          amount: (invoice.amount_due || 0) / 100,
          currency: invoice.currency?.toUpperCase() || "EUR",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          metadata: { attempt_count: currentAttempts, dunning_step: currentAttempts },
        });

        // Update contract dunning state
        await db.from("renewal_contracts")
          .update({ risk_level: riskLevel, dunning_attempts: currentAttempts })
          .eq("id", contract.id);

        // Send dunning email
        const alertType = currentAttempts >= 3 ? "payment_failed_3" : `payment_failed_${currentAttempts}`;
        try {
          await fetch(`${supabaseUrl}/functions/v1/renewal-alert-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              contract_id: contract.id,
              workspace_id: contract.workspace_id,
              alert_type: alertType,
              recipients: "both",
            }),
          });
        } catch (emailErr) {
          console.error("[RENEWAL-WEBHOOK] Dunning email error:", emailErr);
        }

        // Auto-cancel after 3 failed attempts
        if (currentAttempts >= 3 && contract.stripe_subscription_id) {
          console.log(`[RENEWAL-WEBHOOK] Cancelling subscription after ${currentAttempts} failures`);

          try {
            await stripe.subscriptions.cancel(contract.stripe_subscription_id);
          } catch (cancelErr) {
            console.error("[RENEWAL-WEBHOOK] Stripe cancel error:", cancelErr);
          }

          await db.from("renewal_contracts")
            .update({ status: "churned", risk_level: "critical" })
            .eq("id", contract.id);

          await db.from("renewal_payment_events").insert({
            workspace_id: contract.workspace_id,
            contract_id: contract.id,
            stripe_event_id: `auto-cancel-${event.id}`,
            event_type: "subscription_cancelled",
            stripe_subscription_id: subscriptionId,
            metadata: { reason: "dunning_max_attempts", attempts: currentAttempts },
          });

          await db.from("workspace_subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);

          // Send cancellation email
          try {
            await fetch(`${supabaseUrl}/functions/v1/renewal-alert-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                contract_id: contract.id,
                workspace_id: contract.workspace_id,
                alert_type: "service_cancelled",
                recipients: "both",
              }),
            });
          } catch (emailErr) {
            console.error("[RENEWAL-WEBHOOK] Cancellation email error:", emailErr);
          }
        }

        console.log(`[RENEWAL-WEBHOOK] Payment FAILED (attempt ${currentAttempts}) for contract ${contract.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) break;

        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "subscription_cancelled",
          stripe_subscription_id: subscriptionId,
          metadata: { canceled_at: subscription.canceled_at },
        });

        await db.from("renewal_contracts")
          .update({ status: "churned" })
          .eq("id", contract.id);

        await db.from("workspace_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);

        console.log(`[RENEWAL-WEBHOOK] Subscription cancelled for contract ${contract.id}`);
        break;
      }

      default:
        console.log(`[RENEWAL-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[RENEWAL-WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
