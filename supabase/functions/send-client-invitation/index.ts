import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClientInvitationRequest {
  clientName: string;
  clientEmail: string;
  workspaceName: string;
  portalUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, workspaceName, portalUrl }: ClientInvitationRequest = await req.json();

    // Validate required fields
    if (!clientName || !clientEmail || !workspaceName) {
      throw new Error("Campos obrigatórios em falta: clientName, clientEmail, workspaceName");
    }

    const finalPortalUrl = portalUrl || "https://fastcrm.lovable.app/client-portal";

    const emailResponse = await resend.emails.send({
      from: "FastCRM <noreply@m.fastcrm.metodopare.ai>",
      to: [clientEmail],
      subject: `Convite para o Portal de Clientes - ${workspaceName}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Portal de Clientes</h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">${workspaceName}</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px; font-weight: 600;">Olá ${clientName}!</h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Foi convidado(a) para aceder ao Portal de Clientes de <strong>${workspaceName}</strong>.
                      </p>
                      
                      <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        No portal, poderá:
                      </p>
                      
                      <ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;">
                        <li>Fazer encomendas de forma rápida e fácil</li>
                        <li>Consultar o histórico de encomendas</li>
                        <li>Acompanhar o estado das suas encomendas</li>
                        <li>Gerir os seus dados de facturação</li>
                      </ul>
                      
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${finalPortalUrl}" 
                               style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                              Aceder ao Portal
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                        Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                        <a href="${finalPortalUrl}" style="color: #6366f1;">${finalPortalUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center; line-height: 1.6;">
                        Este email foi enviado automaticamente por ${workspaceName}.<br>
                        Se não esperava este convite, pode ignorar este email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Client invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-client-invitation function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
