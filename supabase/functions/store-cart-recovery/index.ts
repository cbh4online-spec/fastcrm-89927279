/**
 * Cart Recovery Sequence — Processes abandoned carts and sends recovery messages.
 * Called via pg_cron every 5 minutes or on-demand.
 *
 * Touch 1: 1h after detection — Email with cart contents + recovery link
 * Touch 2: 6h after detection — WhatsApp/SMS reminder
 * Touch 3: 24h after detection — Final email with urgency
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const now = new Date();

    // Expire old carts
    await sb
      .from("abandoned_carts")
      .update({ recovery_status: "expired" })
      .lt("expires_at", now.toISOString())
      .in("recovery_status", ["pending", "touch_1_sent", "touch_2_sent", "touch_3_sent"]);

    // Get carts needing touches
    const { data: carts, error } = await sb
      .from("abandoned_carts")
      .select("*")
      .in("recovery_status", ["pending", "touch_1_sent", "touch_2_sent"])
      .gt("expires_at", now.toISOString())
      .limit(50);

    if (error) {
      console.error("[RECOVERY] Query error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let touches = { touch1: 0, touch2: 0, touch3: 0 };

    for (const cart of carts || []) {
      const detectedAt = new Date(cart.detected_at).getTime();
      const elapsed = now.getTime() - detectedAt;
      const hours = elapsed / (1000 * 60 * 60);

      // Touch 1: After 1h, status=pending
      if (cart.recovery_status === "pending" && hours >= 1) {
        if (cart.customer_email) {
          await sendRecoveryEmail(sb, cart, "touch_1");
        }
        await sb
          .from("abandoned_carts")
          .update({ recovery_status: "touch_1_sent", touch_1_at: now.toISOString() })
          .eq("id", cart.id);
        touches.touch1++;
      }

      // Touch 2: After 6h, status=touch_1_sent
      if (cart.recovery_status === "touch_1_sent" && hours >= 6) {
        // Try WhatsApp/SMS if phone available, else email
        if (cart.customer_phone) {
          await sendRecoverySMS(sb, cart);
        } else if (cart.customer_email) {
          await sendRecoveryEmail(sb, cart, "touch_2");
        }
        await sb
          .from("abandoned_carts")
          .update({ recovery_status: "touch_2_sent", touch_2_at: now.toISOString() })
          .eq("id", cart.id);
        touches.touch2++;
      }

      // Touch 3: After 24h, status=touch_2_sent
      if (cart.recovery_status === "touch_2_sent" && hours >= 24) {
        if (cart.customer_email) {
          await sendRecoveryEmail(sb, cart, "touch_3");
        }
        await sb
          .from("abandoned_carts")
          .update({ recovery_status: "touch_3_sent", touch_3_at: now.toISOString() })
          .eq("id", cart.id);
        touches.touch3++;
      }
    }

    console.log(`[RECOVERY] Touches sent:`, touches);

    return new Response(JSON.stringify({ processed: carts?.length || 0, touches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[RECOVERY] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendRecoveryEmail(sb: any, cart: any, touch: string) {
  const cartItems = Array.isArray(cart.cart_items) ? cart.cart_items : [];
  const itemsList = cartItems
    .map((i: any) => `• ${i.name || i.productName || "Produto"} (x${i.quantity || 1}) — ${(i.price || 0).toFixed(2)}€`)
    .join("\n");

  const subjects: Record<string, string> = {
    touch_1: `${cart.customer_name || "Olá"}, esqueceu-se de algo? 🛒`,
    touch_2: `O seu carrinho ainda está à sua espera!`,
    touch_3: `Última oportunidade — o seu carrinho expira em breve ⏰`,
  };

  const urgency = touch === "touch_3"
    ? "\n\n⚠️ O seu carrinho expira nas próximas 24 horas. Não perca os seus produtos!"
    : "";

  const body = `Olá ${cart.customer_name || ""},

Reparámos que deixou produtos no seu carrinho:

${itemsList}

Total: ${Number(cart.cart_value || 0).toFixed(2)}€${urgency}

👉 Recupere o seu carrinho aqui: ${cart.recovery_url}

Se tiver alguma dúvida, responda a este email.`;

  try {
    // Try transactional email system
    await sb.functions.invoke("send-transactional-email", {
      body: {
        templateName: "cart-recovery",
        recipientEmail: cart.customer_email,
        idempotencyKey: `cart-recovery-${cart.id}-${touch}`,
        templateData: {
          name: cart.customer_name,
          cartItems: itemsList,
          totalValue: Number(cart.cart_value || 0).toFixed(2),
          recoveryUrl: cart.recovery_url,
          subject: subjects[touch],
          isUrgent: touch === "touch_3",
        },
      },
    });
  } catch {
    // Fallback: log that email couldn't be sent (transactional email system may not be set up)
    console.warn(`[RECOVERY] Email system not available for cart ${cart.id} touch ${touch}`);
  }
}

async function sendRecoverySMS(sb: any, cart: any) {
  const message = `Olá ${cart.customer_name || ""}! 🛒 O seu carrinho de ${Number(cart.cart_value || 0).toFixed(2)}€ está à sua espera. Recupere aqui: ${cart.recovery_url}`;

  try {
    // Try WhatsApp first
    const { data: whatsappConn } = await sb
      .from("whatsapp_qr_connections")
      .select("instance_name, is_connected")
      .eq("workspace_id", cart.workspace_id)
      .eq("is_connected", true)
      .limit(1)
      .single();

    if (whatsappConn) {
      await sb.functions.invoke("whatsapp-evolution-send", {
        body: {
          workspace_id: cart.workspace_id,
          phone: cart.customer_phone,
          message,
        },
      });
      return;
    }
  } catch {
    // WhatsApp not available
  }

  // Fallback: log (SMS via Twilio can be added when configured)
  console.warn(`[RECOVERY] No messaging channel available for cart ${cart.id}`);
}
