import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  orderId: string;
  newStatus: string;
  rejectionReason?: string;
}

const statusMessages: Record<string, { subject: string; title: string; message: string; color: string }> = {
  approved: {
    subject: "Encomenda Aprovada",
    title: "✅ A sua encomenda foi aprovada!",
    message: "Temos o prazer de informar que a sua encomenda foi aprovada e será processada em breve.",
    color: "#059669",
  },
  rejected: {
    subject: "Encomenda Não Aprovada",
    title: "❌ A sua encomenda não foi aprovada",
    message: "Lamentamos informar que não foi possível aprovar a sua encomenda.",
    color: "#dc2626",
  },
  in_preparation: {
    subject: "Encomenda em Preparação",
    title: "📦 A sua encomenda está a ser preparada!",
    message: "A sua encomenda está agora em preparação. Em breve receberá mais informações.",
    color: "#7c3aed",
  },
  invoiced: {
    subject: "Encomenda Faturada",
    title: "📄 A sua encomenda foi faturada",
    message: "A sua encomenda foi faturada. Obrigado pela sua compra!",
    color: "#0891b2",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, newStatus, rejectionReason }: NotifyRequest = await req.json();

    if (!orderId || !newStatus) {
      throw new Error("Order ID and new status are required");
    }

    const statusConfig = statusMessages[newStatus];
    if (!statusConfig) {
      throw new Error(`No email template for status: ${newStatus}`);
    }

    // Get order with client info
    const { data: order, error: orderError } = await adminClient
      .from("order_notes")
      .select(`
        *,
        client_user:client_users!order_notes_client_user_id_fkey(
          id, name, email, workspace_id
        ),
        items:order_note_items(*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get workspace info
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", order.client_user?.workspace_id)
      .single();

    const clientEmail = order.client_user?.email;
    if (!clientEmail) {
      throw new Error("Client email not found");
    }

    const resend = new Resend(resendApiKey);

    const itemsHtml = (order.items || [])
      .map(
        (item: { product_name: string; quantity: number; unit_price_net: number }) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${(item.quantity * item.unit_price_net).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const rejectionBlock = newStatus === "rejected" && rejectionReason
      ? `
        <div style="background-color: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">Motivo</h3>
          <p style="margin: 0; color: #991b1b;">${rejectionReason}</p>
        </div>
      `
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${statusConfig.subject} - ${order.order_number}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${statusConfig.color}; padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusConfig.title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${workspace?.name || "Loja"}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 25px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">${statusConfig.message}</p>
          
          ${rejectionBlock}

          <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Detalhes da Encomenda</h2>
            <p style="margin: 5px 0;"><strong>Número:</strong> ${order.order_number}</p>
            <p style="margin: 5px 0;"><strong>Data do pedido:</strong> ${new Date(order.submitted_at || order.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>

          <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📦 Produtos</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produto</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qtd</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: ${statusConfig.color};">€${order.total_gross?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>Obrigado por escolher ${workspace?.name || "a nossa loja"}!</p>
          <p>Este email foi enviado automaticamente. Por favor não responda.</p>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: `${workspace?.name || "Encomendas"} <noreply@resend.dev>`,
      to: [clientEmail],
      subject: `${statusConfig.subject} #${order.order_number}`,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({ success: true, email: clientEmail }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in order-note-notify:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
