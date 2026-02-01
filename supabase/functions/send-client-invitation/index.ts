import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  workspaceId: string;
  portalUrl: string;
  temporaryPassword?: string;
}

interface EmailTemplate {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  header_title: string;
  greeting_template: string;
  intro_text: string;
  features_title: string;
  features_list: string[];
  button_text: string;
  footer_text: string;
  custom_portal_url: string | null;
}

const defaultTemplate: EmailTemplate = {
  logo_url: null,
  primary_color: "#6366f1",
  secondary_color: "#8b5cf6",
  header_title: "Portal de Clientes",
  greeting_template: "Olá {{client_name}}!",
  intro_text: "Foi convidado(a) para aceder ao Portal de Clientes de {{workspace_name}}.",
  features_title: "No portal, poderá:",
  features_list: [
    "Fazer encomendas de forma rápida e fácil",
    "Consultar o histórico de encomendas",
    "Acompanhar o estado das suas encomendas",
    "Gerir os seus dados de facturação"
  ],
  button_text: "Aceder ao Portal",
  footer_text: "Este email foi enviado automaticamente por {{workspace_name}}.",
  custom_portal_url: null,
};

function replaceVariables(text: string, clientName: string, workspaceName: string): string {
  return text
    .replace(/\{\{client_name\}\}/g, clientName)
    .replace(/\{\{workspace_name\}\}/g, workspaceName);
}

function generateEmailHtml(
  template: EmailTemplate,
  clientName: string,
  clientEmail: string,
  workspaceName: string,
  portalUrl: string,
  temporaryPassword?: string
): string {
  const greeting = replaceVariables(template.greeting_template, clientName, workspaceName);
  const intro = replaceVariables(template.intro_text, clientName, workspaceName);
  const footer = replaceVariables(template.footer_text, clientName, workspaceName);
  
  const finalPortalUrl = template.custom_portal_url || portalUrl;

  // Build credentials section if temporary password is provided
  const credentialsSection = temporaryPassword ? `
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid ${template.primary_color};">
      <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px; font-weight: 600;">🔐 Credenciais de Acesso</h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #52525b; font-size: 14px; width: 140px;">Email:</td>
          <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #52525b; font-size: 14px;">Palavra-passe:</td>
          <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; font-family: monospace; background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; display: inline-block;">${temporaryPassword}</td>
        </tr>
      </table>
      <p style="margin: 15px 0 0; color: #dc2626; font-size: 13px; font-weight: 500;">
        ⚠️ IMPORTANTE: Por razões de segurança, será solicitado que altere a sua palavra-passe no primeiro acesso.
      </p>
    </div>
  ` : '';

  // Build features list
  const featuresHtml = template.features_list.map(feature => `<li>${feature}</li>`).join('\n');

  // Build logo or title
  const headerContent = template.logo_url 
    ? `<img src="${template.logo_url}" alt="${workspaceName}" style="max-height: 60px; margin-bottom: 10px;" />`
    : '';

  return `
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
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%); border-radius: 12px 12px 0 0;">
                  ${headerContent}
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${template.header_title}</h1>
                  <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">${workspaceName}</p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px; font-weight: 600;">${greeting}</h2>
                  
                  <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                    ${intro}
                  </p>
                  
                  ${credentialsSection}
                  
                  <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                    ${template.features_title}
                  </p>
                  
                  <ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;">
                    ${featuresHtml}
                  </ul>
                  
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${finalPortalUrl}" 
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px ${template.primary_color}66;">
                          ${template.button_text}
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                    Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                    <a href="${finalPortalUrl}" style="color: ${template.primary_color};">${finalPortalUrl}</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                  <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center; line-height: 1.6;">
                    ${footer}<br>
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
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, workspaceName, workspaceId, portalUrl, temporaryPassword }: ClientInvitationRequest = await req.json();

    // Validate required fields
    if (!clientName || !clientEmail || !workspaceName) {
      throw new Error("Campos obrigatórios em falta: clientName, clientEmail, workspaceName");
    }

    const finalPortalUrl = portalUrl || "https://fastcrm.lovable.app/client/login";

    // Try to fetch custom template if workspaceId is provided
    let template: EmailTemplate = defaultTemplate;
    
    if (workspaceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          const { data: customTemplate, error } = await supabase
            .from("workspace_email_templates")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("template_type", "client_invitation")
            .maybeSingle();
          
          if (!error && customTemplate) {
            template = {
              logo_url: customTemplate.logo_url,
              primary_color: customTemplate.primary_color || defaultTemplate.primary_color,
              secondary_color: customTemplate.secondary_color || defaultTemplate.secondary_color,
              header_title: customTemplate.header_title || defaultTemplate.header_title,
              greeting_template: customTemplate.greeting_template || defaultTemplate.greeting_template,
              intro_text: customTemplate.intro_text || defaultTemplate.intro_text,
              features_title: customTemplate.features_title || defaultTemplate.features_title,
              features_list: Array.isArray(customTemplate.features_list) 
                ? customTemplate.features_list.map((f: unknown) => String(f))
                : defaultTemplate.features_list,
              button_text: customTemplate.button_text || defaultTemplate.button_text,
              footer_text: customTemplate.footer_text || defaultTemplate.footer_text,
              custom_portal_url: customTemplate.custom_portal_url,
            };
          }
        }
      } catch (templateError) {
        console.error("Error fetching custom template, using default:", templateError);
      }
    }

    const emailHtml = generateEmailHtml(
      template,
      clientName,
      clientEmail,
      workspaceName,
      finalPortalUrl,
      temporaryPassword
    );

    const emailResponse = await resend.emails.send({
      from: "FastCRM <noreply@m.fastcrm.metodopare.ai>",
      to: [clientEmail],
      subject: `Convite para o Portal de Clientes - ${workspaceName}`,
      html: emailHtml,
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
