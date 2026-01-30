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
      const paymentIntentId = session.payment_intent as string;
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

      // Idempotency check - prevent duplicate processing
      if (proposalId && paymentIntentId) {
        const { data: existing } = await supabaseClient
          .from("proposals")
          .select("payment_idempotency_key")
          .eq("id", proposalId)
          .single();

        if (existing?.payment_idempotency_key === paymentIntentId) {
          console.log(`[PROPOSAL-WEBHOOK] Already processed: ${paymentIntentId}`);
          return new Response(JSON.stringify({ received: true, status: "already_processed" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get proposal with opportunity details
        const { data: proposal } = await supabaseClient
          .from("proposals")
          .select("title, template_id, contact_id, company_id, opportunities(id, title, owner_id, lead_id, value)")
          .eq("id", proposalId)
          .single();

        // Extract opportunity data
        const opportunity = (proposal?.opportunities as unknown) as { 
          id: string; 
          title: string; 
          owner_id: string | null; 
          lead_id: string | null; 
          value: number | null;
        } | null;

        // Get proposal items for product tracking
        const { data: proposalItems } = await supabaseClient
          .from("proposal_items")
          .select("*")
          .eq("proposal_id", proposalId)
          .eq("is_enabled", true);

        // Update proposal with idempotency key and status
        await supabaseClient
          .from("proposals")
          .update({
            status: "accepted",
            payment_status: "completed",
            stripe_payment_intent_id: paymentIntentId,
            payment_idempotency_key: paymentIntentId,
            accepted_at: new Date().toISOString(),
          })
          .eq("id", proposalId);

        // Update opportunity to won and update value if paid amount differs
        if (opportunityId) {
          const updateData: Record<string, unknown> = { 
            status: "won",
            updated_at: new Date().toISOString()
          };
          
          // Update opportunity value to match the actual payment if different
          if (amountPaid > 0 && opportunity?.value !== amountPaid) {
            updateData.value = amountPaid;
          }

          await supabaseClient
            .from("opportunities")
            .update(updateData)
            .eq("id", opportunityId);

          console.log(`[PROPOSAL-WEBHOOK] Opportunity ${opportunityId} marked as won`);
        }

        // Create contact_products records for each item (product ownership tracking)
        if (proposalItems && proposalItems.length > 0 && workspaceId) {
          const contactId = proposal?.contact_id || opportunity?.lead_id;
          const companyId = proposal?.company_id;
          
          for (const item of proposalItems) {
            if (item.product_id) {
              await supabaseClient.from("contact_products").insert({
                workspace_id: workspaceId,
                contact_id: contactId || null,
                company_id: companyId || null,
                product_id: item.product_id,
                quantity: item.quantity,
                purchased_quantity: item.quantity,
                unit_price: item.unit_price,
                total_value: item.total_price || (item.quantity * item.unit_price),
                acquisition_date: new Date().toISOString().split('T')[0],
                status: "active",
                notes: `Adquirido via proposta: ${proposal?.title || proposalId}`,
              });
            }
          }
          console.log(`[PROPOSAL-WEBHOOK] Created ${proposalItems.length} contact_products records`);
        }

        // Log activity and analytics
        if (workspaceId) {
          // CRM Activity log - this is crucial for the unified activity timeline
          if (opportunityId) {
            await supabaseClient.from("crm_activities").insert({
              workspace_id: workspaceId,
              entity_type: "opportunity",
              entity_id: opportunityId,
              opportunity_id: opportunityId,
              lead_id: opportunity?.lead_id || null,
              activity_type: "deal_won",
              title: `Proposta aceite e paga`,
              description: `A proposta "${proposal?.title || ""}" foi aceite. Valor: €${amountPaid.toLocaleString("pt-PT")}`,
              performed_by: opportunity?.owner_id || null,
              metadata: {
                proposal_id: proposalId,
                amount: amountPaid,
                currency: session.currency,
                payment_intent: paymentIntentId,
                source: "proposal_payment"
              }
            });
          }

          // Proposal activity log
          await supabaseClient.from("proposal_activity_logs").insert({
            proposal_id: proposalId,
            workspace_id: workspaceId,
            action: "payment_completed",
            details: {
              amount: session.amount_total,
              currency: session.currency,
              payment_intent: paymentIntentId,
            },
          });

          // Analytics
          await supabaseClient.from("proposal_analytics").insert({
            workspace_id: workspaceId,
            proposal_id: proposalId,
            template_id: proposal?.template_id,
            event_type: "payment_completed",
            metadata: {
              amount: session.amount_total,
              currency: session.currency,
            },
          });

          // Trigger automation: proposal_paid
          const { data: automationRules } = await supabaseClient
            .from("automation_rules")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("trigger", "proposal_paid")
            .eq("is_active", true);

          if (automationRules && automationRules.length > 0) {
            for (const rule of automationRules) {
              await supabaseClient.from("automation_logs").insert({
                rule_id: rule.id,
                workspace_id: workspaceId,
                trigger_data: {
                  proposal_id: proposalId,
                  opportunity_id: opportunityId,
                  amount: session.amount_total,
                  currency: session.currency,
                },
                status: "pending",
              });
            }
            console.log(`[PROPOSAL-WEBHOOK] Triggered ${automationRules.length} automations`);
          }

          // Also trigger opportunity_won automations
          const { data: wonRules } = await supabaseClient
            .from("automation_rules")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("trigger", "opportunity_won")
            .eq("is_active", true);

          if (wonRules && wonRules.length > 0) {
            for (const rule of wonRules) {
              await supabaseClient.from("automation_logs").insert({
                rule_id: rule.id,
                workspace_id: workspaceId,
                trigger_data: {
                  opportunity_id: opportunityId,
                  proposal_id: proposalId,
                  amount: amountPaid,
                  currency: session.currency,
                  won_via: "proposal_payment"
                },
                status: "pending",
              });
            }
            console.log(`[PROPOSAL-WEBHOOK] Triggered ${wonRules.length} opportunity_won automations`);
          }
        }

        console.log(`[PROPOSAL-WEBHOOK] Proposal ${proposalId} accepted with payment €${amountPaid}`);
      }
    }

    // Handle payment failures
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      let proposalId: string | undefined;
      
      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        proposalId = session.metadata?.proposal_id;
      }
      
      if (proposalId) {
        await supabaseClient
          .from("proposals")
          .update({ payment_status: "failed" })
          .eq("id", proposalId);
        
        console.log(`[PROPOSAL-WEBHOOK] Payment failed for proposal ${proposalId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[PROPOSAL-WEBHOOK] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
