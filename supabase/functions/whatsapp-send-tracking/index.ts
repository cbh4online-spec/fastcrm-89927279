// WhatsApp Order Tracking Notification — invoked by store_orders trigger
// when tracking_number is added/updated. Sends a WhatsApp message to the
// customer with the carrier and tracking URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  order_id: string;
  workspace_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    if (!body.order_id || !body.workspace_id) return json({ error: "missing_params" }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: order, error: orderErr } = await supa
      .from("store_orders")
      .select("id, workspace_id, order_number, customer_name, customer_phone, tracking_number, tracking_carrier, tracking_url")
      .eq("id", body.order_id)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "order_not_found", fallback: true }, 200);
    if (!order.customer_phone) return json({ error: "no_phone", skipped: true, fallback: true }, 200);
    if (!order.tracking_number) return json({ error: "no_tracking", skipped: true, fallback: true }, 200);

    const { data: settings } = await supa
      .from("whatsapp_settings")
      .select("order_tracking_enabled, order_tracking_template")
      .eq("workspace_id", body.workspace_id)
      .maybeSingle();

    if (settings?.order_tracking_enabled === false) {
      return json({ success: true, skipped: true, reason: "disabled" });
    }

    const template = settings?.order_tracking_template
      ?? "Olá {{customer_name}}! 📦 A sua encomenda #{{order_number}} foi expedida{{carrier_clause}}. Acompanhe aqui: {{tracking_url}}";

    const carrier = (order.tracking_carrier || "").trim();
    const trackingUrl = order.tracking_url
      || (carrier ? buildTrackingUrl(carrier, order.tracking_number) : "")
      || "";

    const msg = renderTemplate(template, {
      customer_name: order.customer_name || "cliente",
      order_number: String(order.order_number ?? order.id),
      carrier: carrier || "transportadora",
      carrier_clause: carrier ? ` via ${carrier}` : "",
      tracking_number: order.tracking_number,
      tracking_url: trackingUrl,
    });

    const sendResp = await supa.functions.invoke("whatsapp-pro-send", {
      body: {
        workspaceId: body.workspace_id,
        phone: order.customer_phone,
        messageType: "text",
        text: msg,
        metadata: {
          source: "order_tracking",
          order_id: order.id,
          tracking_number: order.tracking_number,
        },
      },
    });

    if (sendResp.error || sendResp.data?.error) {
      console.error("tracking send error", sendResp.error ?? sendResp.data?.error);
      return json({ error: "send_failed", fallback: true, details: sendResp.error?.message ?? sendResp.data?.error }, 200);
    }

    return json({ success: true });
  } catch (e) {
    console.error("whatsapp-send-tracking", e);
    return json({ error: "internal_error", fallback: true }, 200);
  }
});

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function buildTrackingUrl(carrier: string, code: string): string {
  const c = carrier.toLowerCase();
  if (c.includes("ctt")) return `https://appserver2.ctt.pt/CustomerArea/PublicArea_Detail?IsFromPublicArea=true&ObjectCodeInput=${encodeURIComponent(code)}`;
  if (c.includes("dhl")) return `https://www.dhl.com/pt-pt/home/tracking.html?tracking-id=${encodeURIComponent(code)}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(code)}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(code)}`;
  if (c.includes("nacex")) return `https://www.nacex.pt/seguimientoDetalle.do?agencia_origen=&codAlb=${encodeURIComponent(code)}`;
  if (c.includes("seur")) return `https://www.seur.com/livetracking/?segWebChannel=portal&segWebDestino=detalleEnvio&idCliente=&numeroAlbaran=${encodeURIComponent(code)}`;
  return "";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
