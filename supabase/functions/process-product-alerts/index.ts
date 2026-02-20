import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[PROCESS-ALERTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { productId, alertType } = await req.json();
    log("Started", { productId, alertType });

    if (!productId) throw new Error("productId is required");

    // Get product info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, base_price, stock_status, store_published, workspace_id, images, primary_image_index")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    // Get workspace for store slug
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug, name")
      .eq("id", product.workspace_id)
      .single();

    // Find active alerts for this product
    let query = supabase
      .from("store_product_alerts")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .is("notified_at", null);

    if (alertType) {
      query = query.eq("alert_type", alertType);
    }

    const { data: alerts, error: alertsError } = await query;
    if (alertsError) throw alertsError;

    if (!alerts || alerts.length === 0) {
      log("No active alerts to process");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log(`Found ${alerts.length} alerts to process`);

    if (!resendKey) {
      log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(JSON.stringify({ processed: 0, error: "No RESEND_API_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);
    let processed = 0;
    const storeUrl = `https://fastcrm.lovable.app/store/${workspace?.slug || product.workspace_id}/product/${product.id}`;
    const productImage = product.images?.[product.primary_image_index ?? 0] || product.images?.[0];

    for (const alert of alerts) {
      try {
        // For price_drop, check if current price meets target
        if (alert.alert_type === "price_drop") {
          if (alert.target_price && product.base_price > alert.target_price) {
            continue; // Price hasn't dropped enough
          }
        }

        // For back_in_stock, check if product is actually in stock
        if (alert.alert_type === "back_in_stock") {
          if (product.stock_status === "out_of_stock") {
            continue; // Still out of stock
          }
        }

        const subject = alert.alert_type === "price_drop"
          ? `💰 O preço de ${product.name} baixou!`
          : `📦 ${product.name} voltou ao stock!`;

        const htmlContent = alert.alert_type === "price_drop"
          ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">💰 Alerta de Preço</h2>
              <p>O preço de <strong>${product.name}</strong> baixou!</p>
              ${productImage ? `<img src="${productImage}" alt="${product.name}" style="max-width: 200px; border-radius: 12px; margin: 16px 0;" />` : ""}
              <p style="font-size: 24px; font-weight: bold; color: #16a34a;">€${product.base_price.toFixed(2)}</p>
              ${alert.target_price ? `<p style="color: #666;">O seu preço alvo era: €${alert.target_price.toFixed(2)}</p>` : ""}
              <a href="${storeUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Ver Produto</a>
              <p style="margin-top: 24px; font-size: 12px; color: #999;">
                ${workspace?.name || "Loja"} — Este alerta foi desativado automaticamente.
              </p>
            </div>
          `
          : `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">📦 Produto Disponível</h2>
              <p><strong>${product.name}</strong> voltou ao stock!</p>
              ${productImage ? `<img src="${productImage}" alt="${product.name}" style="max-width: 200px; border-radius: 12px; margin: 16px 0;" />` : ""}
              <p style="font-size: 24px; font-weight: bold;">€${product.base_price.toFixed(2)}</p>
              <a href="${storeUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Comprar Agora</a>
              <p style="margin-top: 24px; font-size: 12px; color: #999;">
                ${workspace?.name || "Loja"} — Este alerta foi desativado automaticamente.
              </p>
            </div>
          `;

        await resend.emails.send({
          from: `${workspace?.name || "Loja"} <noreply@fastcrm.lovable.app>`,
          to: [alert.email],
          subject,
          html: htmlContent,
        });

        // Mark alert as notified and deactivated
        await supabase
          .from("store_product_alerts")
          .update({ notified_at: new Date().toISOString(), is_active: false })
          .eq("id", alert.id);

        processed++;
        log(`Notified ${alert.email} for ${alert.alert_type}`);
      } catch (emailErr) {
        log(`Failed to notify ${alert.email}`, emailErr);
      }
    }

    log(`Completed`, { processed, total: alerts.length });
    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
