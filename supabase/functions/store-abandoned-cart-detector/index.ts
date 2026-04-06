/**
 * Abandoned Cart Detector — Runs via pg_cron every 15 minutes.
 * Identifies sessions with cart items that haven't converted and creates
 * abandoned_carts records + triggers recovery sequence.
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
    // Find sessions with cart items, not converted, inactive for >1h, not yet processed
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: sessions, error } = await sb
      .from("store_visitor_sessions")
      .select("id, session_id, workspace_id, contact_id, cart_items, cart_subtotal, last_activity_at")
      .not("cart_items", "is", null)
      .eq("converted", false)
      .or("cart_processed.is.null,cart_processed.eq.false")
      .lt("last_activity_at", oneHourAgo)
      .limit(100);

    if (error) {
      console.error("[ABANDONED] Query error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessions?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;

    for (const session of sessions) {
      const cartItems = session.cart_items;
      if (!cartItems || (Array.isArray(cartItems) && cartItems.length === 0)) continue;

      // Get contact info if available
      let customerEmail = "";
      let customerName = "";
      let customerPhone = "";

      if (session.contact_id) {
        const { data: contact } = await sb
          .from("contacts")
          .select("name, email, phone")
          .eq("id", session.contact_id)
          .single();
        if (contact) {
          customerEmail = contact.email || "";
          customerName = contact.name || "";
          customerPhone = contact.phone || "";
        }
      }

      // Skip if no contact info at all (can't send recovery)
      if (!customerEmail && !customerPhone) {
        // Still mark as processed
        await sb
          .from("store_visitor_sessions")
          .update({ cart_processed: true })
          .eq("id", session.id);
        continue;
      }

      const recoveryId = crypto.randomUUID();
      const recoveryUrl = `${SUPABASE_URL.replace(".supabase.co", ".lovable.app")}/store/recover/${recoveryId}`;

      const { error: insertError } = await sb
        .from("abandoned_carts")
        .insert({
          id: recoveryId,
          workspace_id: session.workspace_id,
          session_id: session.session_id,
          contact_id: session.contact_id,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          cart_items: cartItems,
          cart_value: session.cart_subtotal || 0,
          recovery_url: recoveryUrl,
          recovery_status: "pending",
          detected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        console.error("[ABANDONED] Insert error:", insertError.message);
        continue;
      }

      // Mark session as processed
      await sb
        .from("store_visitor_sessions")
        .update({ cart_processed: true })
        .eq("id", session.id);

      created++;
    }

    console.log(`[ABANDONED] Detected ${created} abandoned carts`);

    return new Response(JSON.stringify({ processed: sessions.length, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ABANDONED] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
