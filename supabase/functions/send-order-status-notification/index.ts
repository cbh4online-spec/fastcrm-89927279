import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  confirmed: "Confirmada",
  processing: "Em Processamento",
  shipped: "Enviada",
  delivered: "Entregue",
  completed: "Concluída",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

const STATUS_MESSAGES: Record<string, { subject: string; heading: string; body: string }> = {
  paid: {
    subject: "Pagamento confirmado",
    heading: "Pagamento recebido!",
    body: "O pagamento da sua encomenda foi confirmado com sucesso. Vamos iniciar o processamento em breve.",
  },
  confirmed: {
    subject: "Encomenda confirmada",
    heading: "Encomenda confirmada!",
    body: "A sua encomenda foi confirmada e será processada em breve.",
  },
  processing: {
    subject: "Encomenda em processamento",
    heading: "Estamos a preparar a sua encomenda!",
    body: "A sua encomenda está a ser preparada para envio. Receberá uma notificação quando for expedida.",
  },
  shipped: {
    subject: "Encomenda enviada! 📦",
    heading: "A sua encomenda foi enviada!",
    body: "Temos boas notícias — a sua encomenda está a caminho!",
  },
  delivered: {
    subject: "Encomenda entregue ✅",
    heading: "Encomenda entregue!",
    body: "A sua encomenda foi entregue com sucesso. Esperamos que esteja satisfeito com a sua compra!",
  },
  completed: {
    subject: "Encomenda concluída",
    heading: "Encomenda concluída!",
    body: "A sua encomenda foi concluída. Obrigado pela sua compra!",
  },
  cancelled: {
    subject: "Encomenda cancelada",
    heading: "Encomenda cancelada",
    body: "A sua encomenda foi cancelada. Se não solicitou este cancelamento, por favor contacte-nos.",
  },
  refunded: {
    subject: "Reembolso processado",
    heading: "Reembolso efetuado",
    body: "O reembolso da sua encomenda foi processado. O valor será devolvido ao método de pagamento original.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("[ORDER-STATUS-EMAIL] No RESEND_API_KEY configured, skipping");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, newStatus, oldStatus } = await req.json();

    if (!orderId || !newStatus) {
      throw new Error("Missing required fields: orderId, newStatus");
    }

    // Don't send for same status
    if (oldStatus === newStatus) {
      return new Response(JSON.stringify({ skipped: true, reason: "same_status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("store_orders")
      .select("id, order_number, customer_name, customer_email, items, subtotal, total, currency, tracking_number, tracking_carrier, tracking_url, shipping_method_name")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || "no data"}`);
    }

    if (!order.customer_email) {
      console.log("[ORDER-STATUS-EMAIL] No customer email, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);

    const statusInfo = STATUS_MESSAGES[newStatus] || {
      subject: `Atualização da encomenda`,
      heading: "Atualização da sua encomenda",
      body: `O estado da sua encomenda foi atualizado para: ${STATUS_LABELS[newStatus] || newStatus}.`,
    };

    const items = (order.items as Array<{ name: string; quantity: number; unit_price: number }>) || [];
    const itemsHtml = items.map(i =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">€${(i.unit_price * i.quantity).toFixed(2)}</td></tr>`
    ).join("");

    // Tracking section for shipped status
    let trackingHtml = "";
    if (newStatus === "shipped" && order.tracking_number) {
      trackingHtml = `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px;font-weight:600;color:#0369a1">📦 Informação de Rastreio</p>
          ${order.tracking_carrier ? `<p style="margin:0 0 4px"><strong>Transportadora:</strong> ${order.tracking_carrier}</p>` : ""}
          <p style="margin:0"><strong>Nº de Tracking:</strong> <code style="background:#e0f2fe;padding:2px 6px;border-radius:4px">${order.tracking_number}</code></p>
          ${order.tracking_url ? `<p style="margin:12px 0 0"><a href="${order.tracking_url}" style="background:#0284c7;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Rastrear Encomenda</a></p>` : ""}
        </div>
      `;
    }

    // Status badge color
    const badgeColors: Record<string, string> = {
      paid: "#16a34a",
      confirmed: "#2563eb",
      processing: "#d97706",
      shipped: "#7c3aed",
      delivered: "#16a34a",
      completed: "#16a34a",
      cancelled: "#dc2626",
      refunded: "#6b7280",
    };
    const badgeColor = badgeColors[newStatus] || "#6b7280";

    const orderRef = order.order_number ? ` #${order.order_number}` : "";

    await resend.emails.send({
      from: "Loja <noreply@updates.fastcrm.pt>",
      to: [order.customer_email],
      subject: `${statusInfo.subject}${orderRef}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#333;margin-bottom:8px">${statusInfo.heading}</h1>
          <p>Olá ${order.customer_name || ""},</p>
          <p>${statusInfo.body}</p>
          
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px"><strong>Encomenda:</strong>${orderRef}</p>
            <p style="margin:0 0 8px"><strong>Estado:</strong> <span style="background:${badgeColor};color:white;padding:3px 10px;border-radius:12px;font-size:13px">${STATUS_LABELS[newStatus] || newStatus}</span></p>
            <p style="margin:0"><strong>Total:</strong> €${order.total?.toFixed(2)}</p>
          </div>

          ${trackingHtml}

          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Produto</th><th style="padding:8px;text-align:center">Qtd</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <p style="color:#999;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Se tiver alguma questão, não hesite em contactar-nos.</p>
        </div>
      `,
    });

    console.log(`[ORDER-STATUS-EMAIL] Sent ${newStatus} notification for order ${orderId} to ${order.customer_email}`);

    return new Response(JSON.stringify({ sent: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ORDER-STATUS-EMAIL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
