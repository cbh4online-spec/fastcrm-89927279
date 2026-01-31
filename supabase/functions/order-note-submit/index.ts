import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubmitOrderRequest {
  orderId: string;
  installmentData?: {
    requested: boolean;
    count: number;
    notes: string;
  };
}

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

    // Create client with user's auth context
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { orderId, installmentData }: SubmitOrderRequest = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the order with items and client info
    const { data: order, error: orderError } = await adminClient
      .from("order_notes")
      .select(`
        *,
        client_user:client_users!order_notes_client_user_id_fkey(
          id, name, email, tax_id, billing_address, credit_limit, workspace_id
        ),
        items:order_note_items(*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Verify the order belongs to the authenticated user
    const { data: clientUser, error: clientError } = await adminClient
      .from("client_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("id", order.client_user_id)
      .single();

    if (clientError || !clientUser) {
      throw new Error("Unauthorized: Order does not belong to this user");
    }

    // Verify order is in draft status
    if (order.status !== "draft") {
      throw new Error("Only draft orders can be submitted");
    }

    // Recalculate totals from items (protection against manipulation)
    let totalNet = 0;
    let totalVat = 0;

    for (const item of order.items || []) {
      const lineNet = item.quantity * item.unit_price_net;
      const lineVat = lineNet * (item.vat_rate / 100);
      totalNet += lineNet;
      totalVat += lineVat;
    }

    const totalGross = totalNet + totalVat;

    // Determine status based on installment request
    const newStatus = installmentData?.requested ? "awaiting_approval" : "submitted";

    // Update order
    const updateData: Record<string, unknown> = {
      status: newStatus,
      total_net: totalNet,
      total_vat: totalVat,
      total_gross: totalGross,
      submitted_at: new Date().toISOString(),
    };

    if (installmentData?.requested) {
      updateData.installment_requested = true;
      updateData.installment_count = installmentData.count;
      updateData.installment_notes = installmentData.notes;
    }

    const { error: updateError } = await adminClient
      .from("order_notes")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      throw new Error("Failed to update order: " + updateError.message);
    }

    // Get workspace info for email
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name, email")
      .eq("id", order.client_user?.workspace_id)
      .single();

    // Get workspace members to send email notification
    const { data: admins } = await adminClient
      .from("workspace_members")
      .select("user_id, profiles(email)")
      .eq("workspace_id", order.client_user?.workspace_id)
      .in("role", ["owner", "admin"]);

    // Send email notification if Resend is configured
    if (resendApiKey && admins && admins.length > 0) {
      const resend = new Resend(resendApiKey);
      
      const adminEmails = admins
        .filter(a => a.profiles?.email)
        .map(a => a.profiles.email);

      if (adminEmails.length > 0) {
        const installmentAlert = installmentData?.requested
          ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">⚠️ Pedido de Pagamento em Prestações</h3>
              <p style="margin: 5px 0;"><strong>Número de prestações:</strong> ${installmentData.count}</p>
              <p style="margin: 5px 0;"><strong>Valor por prestação:</strong> €${(totalGross / installmentData.count).toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Justificação:</strong> ${installmentData.notes || "Não especificada"}</p>
              <p style="margin: 5px 0;"><strong>Limite de crédito do cliente:</strong> €${order.client_user?.credit_limit?.toFixed(2) || "Não definido"}</p>
            </div>
          `
          : "";

        const itemsHtml = (order.items || [])
          .map(
            (item: { product_name: string; quantity: number; unit_price_net: number }) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${item.unit_price_net.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${(item.quantity * item.unit_price_net).toFixed(2)}</td>
            </tr>
          `
          )
          .join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Nova Encomenda - ${order.order_number}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Nova Encomenda Recebida</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${workspace?.name || "Workspace"}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 25px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Detalhes da Encomenda</h2>
                <p style="margin: 5px 0;"><strong>Número:</strong> ${order.order_number}</p>
                <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> ${newStatus === "awaiting_approval" ? "Aguardando Aprovação" : "Enviado"}</p>
              </div>

              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">👤 Dados do Cliente</h2>
                <p style="margin: 5px 0;"><strong>Nome:</strong> ${order.client_user?.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${order.client_user?.email}</p>
                <p style="margin: 5px 0;"><strong>NIF:</strong> ${order.client_user?.tax_id || "Não especificado"}</p>
              </div>

              ${installmentAlert}

              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📦 Produtos</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produto</th>
                      <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qtd</th>
                      <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Preço Unit.</th>
                      <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <div style="background: white; border-radius: 8px; padding: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">💰 Totais</h2>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                  <span>Subtotal (sem IVA):</span>
                  <strong>€${totalNet.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                  <span>IVA:</span>
                  <strong>€${totalVat.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 12px 0 0 0; padding-top: 12px; border-top: 2px solid #e5e7eb; font-size: 18px;">
                  <span>Total:</span>
                  <strong style="color: #059669;">€${totalGross.toFixed(2)}</strong>
                </div>
              </div>

              ${order.client_notes ? `
                <div style="background: white; border-radius: 8px; padding: 20px; margin-top: 20px;">
                  <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">📝 Notas do Cliente</h2>
                  <p style="margin: 0; color: #6b7280;">${order.client_notes}</p>
                </div>
              ` : ""}
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>Este email foi enviado automaticamente pelo sistema de encomendas.</p>
            </div>
          </body>
          </html>
        `;

        try {
          await resend.emails.send({
            from: "Encomendas <noreply@resend.dev>",
            to: adminEmails,
            subject: `Nova Encomenda #${order.order_number} - ${order.client_user?.name}`,
            html: emailHtml,
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't fail the order submission if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        orderNumber: order.order_number,
        status: newStatus,
        totals: { net: totalNet, vat: totalVat, gross: totalGross },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in order-note-submit:", error);
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
