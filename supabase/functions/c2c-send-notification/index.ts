import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: (ctx: any) => string }> = {
  c2c_new_sale: {
    title: "Nova venda! 🎉",
    body: (ctx) => `Vendeste "${ctx.listing_title}" por ${ctx.amount}€`,
  },
  c2c_payment_received: {
    title: "Pagamento recebido 💰",
    body: (ctx) => `Recebeste o pagamento de ${ctx.amount}€ pela venda de "${ctx.listing_title}"`,
  },
  c2c_escrow_released: {
    title: "Fundos libertados ✅",
    body: (ctx) => `${ctx.amount}€ foram transferidos para a tua conta`,
  },
  c2c_payout_sent: {
    title: "Payout enviado 🏦",
    body: (ctx) => `Transferência de ${ctx.amount}€ iniciada para a tua conta bancária`,
  },
  c2c_new_review: {
    title: "Nova avaliação ⭐",
    body: (ctx) => `Recebeste uma avaliação de ${ctx.rating}⭐ em "${ctx.listing_title}"`,
  },
  c2c_listing_approved: {
    title: "Anúncio aprovado ✅",
    body: (ctx) => `O teu anúncio "${ctx.listing_title}" foi aprovado e está visível`,
  },
  c2c_listing_rejected: {
    title: "Anúncio rejeitado ❌",
    body: (ctx) => `O teu anúncio "${ctx.listing_title}" foi rejeitado. ${ctx.reason || ""}`,
  },
  c2c_verification_approved: {
    title: "Conta verificada ✅",
    body: () => "A tua conta de vendedor foi verificada com sucesso!",
  },
  c2c_dispute_opened: {
    title: "Disputa aberta ⚠️",
    body: (ctx) => `Uma disputa foi aberta na transação #${ctx.transaction_id?.slice(0, 8)}`,
  },
  c2c_dispute_resolved: {
    title: "Disputa resolvida ✅",
    body: (ctx) => `A disputa #${ctx.dispute_id?.slice(0, 8)} foi resolvida: ${ctx.resolution || ""}`,
  },
  c2c_review_request: {
    title: "Avalia a tua compra 📝",
    body: (ctx) => `Como foi a tua experiência com "${ctx.listing_title}"? Deixa a tua avaliação.`,
  },
  c2c_purchase_confirmed: {
    title: "Compra confirmada 🛒",
    body: (ctx) => `A tua compra de "${ctx.listing_title}" foi confirmada!`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { type, workspace_id, user_id, user_ids, listing_id, context } = await req.json();

    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      return new Response(JSON.stringify({ error: "Unknown notification type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const recipients = user_ids || (user_id ? [user_id] : []);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const notifications = recipients.map((uid: string) => ({
      workspace_id,
      user_id: uid,
      type,
      title: template.title,
      body: template.body(context || {}),
      listing_id: listing_id || null,
    }));

    const { error } = await supabase.from("c2c_notifications").insert(notifications);
    if (error) throw error;

    return new Response(JSON.stringify({ sent: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
