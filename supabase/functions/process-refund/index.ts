import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-REFUND] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const { returnRequestId, action, adminNotes } = await req.json();
    if (!returnRequestId || !action) throw new Error("Missing returnRequestId or action");
    if (!["approve", "reject"].includes(action)) throw new Error("Invalid action");

    logStep("Processing", { returnRequestId, action, userId: user.id });

    // Get return request with order details
    const { data: returnReq, error: rrErr } = await supabaseClient
      .from("return_requests")
      .select("*, store_orders:order_id(*)")
      .eq("id", returnRequestId)
      .single();

    if (rrErr || !returnReq) throw new Error("Return request not found");
    if (returnReq.status !== "pending") throw new Error("Return request is not pending");

    const order = returnReq.store_orders;
    const workspaceId = returnReq.workspace_id;

    if (action === "reject") {
      await supabaseClient.from("return_requests").update({
        status: "rejected",
        admin_notes: adminNotes || null,
        approved_by: user.id,
        rejected_at: new Date().toISOString(),
      }).eq("id", returnRequestId);

      // Add event to order timeline
      await supabaseClient.from("store_order_events").insert({
        order_id: returnReq.order_id,
        workspace_id: workspaceId,
        event_type: "note_added",
        description: `Pedido de devolução ${returnReq.request_number} rejeitado.${adminNotes ? ` Motivo: ${adminNotes}` : ""}`,
        created_by: user.id,
      });

      logStep("Return request rejected");
      return new Response(JSON.stringify({ success: true, status: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPROVE: Process Stripe refund
    const { data: stripeConfig } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (!stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe not configured for workspace");
    }

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, {
      apiVersion: "2025-08-27.basil",
    });

    const paymentIntentId = order.stripe_payment_intent_id;
    if (!paymentIntentId) throw new Error("No payment intent found for this order");

    const refundAmount = returnReq.refund_amount
      ? Math.round(returnReq.refund_amount * 100) // Convert to cents
      : undefined; // Full refund if no amount specified

    logStep("Creating Stripe refund", { paymentIntentId, refundAmount });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(refundAmount ? { amount: refundAmount } : {}),
      reason: "requested_by_customer",
    });

    logStep("Stripe refund created", { refundId: refund.id, amount: refund.amount });

    // Update return request
    await supabaseClient.from("return_requests").update({
      status: "refunded",
      admin_notes: adminNotes || null,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      refunded_at: new Date().toISOString(),
      stripe_refund_id: refund.id,
      refund_amount: refund.amount / 100,
    }).eq("id", returnRequestId);

    // Update order status
    const isFullRefund = returnReq.return_type === "full";
    if (isFullRefund) {
      await supabaseClient.from("store_orders").update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", returnReq.order_id);
    }

    // ============================
    // AUTOMATIC REVOCATION of digital access
    // ============================
    try {
      // Revoke entitlements linked to this order
      const { data: deliveries } = await supabaseClient
        .from("order_deliveries")
        .select("id, deliverable_id, delivery_data, product_deliverables:deliverable_id(deliverable_type, config)")
        .eq("order_id", returnReq.order_id)
        .eq("status", "delivered");

      if (deliveries && deliveries.length > 0) {
        for (const delivery of deliveries) {
          const deliverable = (delivery as any).product_deliverables;
          const deliveryData = delivery.delivery_data as Record<string, unknown> | null;

          if (deliverable?.deliverable_type === "portal_access" && deliveryData?.client_user_id) {
            // Deactivate client entitlements
            const entitlementIds = (deliveryData.entitlements_activated as string[]) || [];
            for (const entKey of entitlementIds) {
              await supabaseClient
                .from("client_entitlements")
                .update({ is_active: false, metadata: { revoked_reason: "refund", return_request_id: returnRequestId } })
                .eq("client_user_id", deliveryData.client_user_id as string)
                .eq("entitlement_key", entKey);
            }
            logStep("Portal entitlements revoked", { count: entitlementIds.length });
          }

          if (deliverable?.deliverable_type === "course_enrollment" && deliveryData?.enrollment_id) {
            // Cancel course enrollment
            await supabaseClient
              .from("sj_enrollments")
              .update({ status: "cancelled" })
              .eq("id", deliveryData.enrollment_id as string);
            logStep("Course enrollment cancelled", { enrollmentId: deliveryData.enrollment_id });
          }

          // Mark delivery as revoked
          await supabaseClient
            .from("order_deliveries")
            .update({ status: "revoked" })
            .eq("id", delivery.id);
        }
        logStep("Digital deliveries revoked", { count: deliveries.length });
      }
    } catch (revokeErr) {
      logStep("Revocation error (non-blocking)", { message: (revokeErr as Error).message });
    }

    // Add event to order timeline
    await supabaseClient.from("store_order_events").insert({
      order_id: returnReq.order_id,
      workspace_id: workspaceId,
      event_type: "refund_issued",
      description: `Reembolso ${isFullRefund ? "total" : "parcial"} de €${(refund.amount / 100).toFixed(2)} processado. Ref: ${refund.id}`,
      created_by: user.id,
      metadata: { refund_id: refund.id, amount: refund.amount / 100, return_request_id: returnRequestId },
    });

    // Send refund notification email
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && order.customer_email) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Loja <noreply@updates.fastcrm.pt>",
          to: [order.customer_email],
          subject: `Reembolso processado — Encomenda #${order.order_number || order.id.slice(0, 8)}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h1 style="color:#333">Reembolso Processado</h1>
              <p>Olá ${order.customer_name},</p>
              <p>O seu pedido de devolução foi aprovado e o reembolso de <strong>€${(refund.amount / 100).toFixed(2)}</strong> foi processado.</p>
              <p>O valor será creditado no seu método de pagamento original dentro de 5-10 dias úteis.</p>
              <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0">
                <p style="margin:0"><strong>Encomenda:</strong> #${order.order_number || order.id.slice(0, 8)}</p>
                <p style="margin:4px 0 0"><strong>Ref. Reembolso:</strong> ${refund.id}</p>
                <p style="margin:4px 0 0"><strong>Valor:</strong> €${(refund.amount / 100).toFixed(2)}</p>
              </div>
              <p style="color:#666;font-size:14px">Se tiver questões, não hesite em contactar-nos.</p>
            </div>
          `,
        });
        logStep("Refund notification email sent");
      }
    } catch (emailErr) {
      logStep("Email error (non-blocking)", { message: (emailErr as Error).message });
    }

    return new Response(JSON.stringify({ success: true, status: "refunded", refundId: refund.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
