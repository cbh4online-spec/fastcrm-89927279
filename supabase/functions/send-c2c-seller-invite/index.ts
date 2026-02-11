import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  invites: Array<{ email: string; name: string; message?: string }>;
  workspaceId: string;
  domain: string;
}

function buildInviteEmail(inviteName: string, workspaceName: string, inviteMessage: string | null, inviteUrl: string): string {
  const messageBlock = inviteMessage
    ? `<tr>
        <td style="padding: 0 0 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color: #f5f5f5; border-radius: 8px; padding: 16px;">
                <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${inviteMessage}"</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Convite para vender no ${workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0;">${workspaceName}</h1>
              <p style="color: #dbeafe; font-size: 14px; margin: 8px 0 0 0;">Marketplace</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <h2 style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">Ola ${inviteName},</h2>
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                      Foi convidado(a) a vender no marketplace <strong>${workspaceName}</strong>.
                    </p>
                  </td>
                </tr>
                ${messageBlock}
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <h3 style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Porque vender connosco?</h3>
                    <ul style="color: #4b5563; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                      <li>Comissoes competitivas</li>
                      <li>Visibilidade para milhares de compradores</li>
                      <li>Ferramentas profissionais de venda</li>
                      <li>Chat direto com compradores</li>
                      <li>Painel de analytics e performance</li>
                    </ul>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 8px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">
                            Ativar Conta de Vendedor
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Fallback link -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                      Se nao conseguir clicar no botao, copie e cole este link no seu navegador:<br />
                      <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                Este convite expira em 7 dias. Se nao reconhece este convite, pode ignorar este email.
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 12px 0 0 0;">
                Este email foi enviado por ${workspaceName} atraves da plataforma FastCRM.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get auth user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { invites, workspaceId, domain }: InviteRequest = await req.json();

    if (!invites?.length || !workspaceId || !domain) {
      throw new Error("invites, workspaceId e domain são obrigatórios");
    }

    // Get workspace info for branding
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("name, slug")
      .eq("id", workspaceId)
      .single();

    if (!workspace) throw new Error("Workspace não encontrado");

    // Resolve production domain from store_settings
    const { data: storeSettings } = await supabaseAdmin
      .from("store_settings")
      .select("custom_domain")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let baseDomain = domain; // fallback to frontend-provided domain
    if (storeSettings?.custom_domain) {
      baseDomain = `https://${storeSettings.custom_domain}`;
    }

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const invite of invites) {
      try {
        // Insert invite record (token is auto-generated by DB default)
        const { data: inviteRecord, error: insertError } = await supabaseAdmin
          .from("c2c_seller_invites")
          .insert({
            workspace_id: workspaceId,
            email: invite.email,
            name: invite.name,
            message: invite.message || null,
            invited_by: user.id,
          })
          .select("invite_token")
          .single();

        if (insertError) {
          results.push({ email: invite.email, success: false, error: insertError.message });
          continue;
        }

        const inviteUrl = `${baseDomain}/c2c/${workspace.slug}/invite/${inviteRecord.invite_token}`;
        const emailHtml = buildInviteEmail(invite.name, workspace.name, invite.message || null, inviteUrl);

        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${workspace.name} <noreply@m.fastcrm.metodopare.ai>`,
            to: [invite.email],
            subject: `Convite para vender no ${workspace.name}`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error("Resend error:", errBody);
          results.push({ email: invite.email, success: false, error: "Erro ao enviar email" });
        } else {
          results.push({ email: invite.email, success: true });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        results.push({ email: invite.email, success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-c2c-seller-invite:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
