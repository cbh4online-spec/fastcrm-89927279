import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ActivateRequest {
  token: string;
  password: string;
  phone?: string;
  iban?: string;
  bank_name?: string;
  account_holder?: string;
  nif?: string;
  bio?: string;
  location?: string;
}

function errorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function buildConfirmationEmail(sellerName: string, workspaceName: string, loginUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Conta ativada - ${workspaceName}</title>
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
                    <h2 style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">Ola ${sellerName},</h2>
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                      A sua conta de vendedor no <strong>${workspaceName}</strong> foi ativada com sucesso! Ja pode comecar a vender.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <h3 style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Proximos passos</h3>
                    <ul style="color: #4b5563; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                      <li>Adicione os seus primeiros produtos</li>
                      <li>Complete o seu perfil de vendedor</li>
                      <li>Configure as suas preferencias de pagamento</li>
                      <li>Explore o painel de analytics</li>
                    </ul>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 8px;">
                          <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">
                            Comecar a Vender
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
                      <a href="${loginUrl}" style="color: #2563eb; word-break: break-all;">${loginUrl}</a>
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
                A sua conta esta pronta. Faca login a qualquer momento para gerir os seus produtos e vendas.
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
    const body: ActivateRequest = await req.json();
    const { token, password, phone, iban, bank_name, account_holder, nif, bio, location } = body;

    if (!token) return errorResponse("Token é obrigatório");
    if (!password || password.length < 8) return errorResponse("Palavra-passe deve ter pelo menos 8 caracteres");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch invite by token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("c2c_seller_invites")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      return errorResponse("Erro ao validar token");
    }
    if (!invite) return errorResponse("Token de convite inválido ou expirado");
    if (invite.status !== "pending") return errorResponse("Este convite já foi utilizado");
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return errorResponse("O convite expirou. Contacte o administrador para obter um novo convite.");
    }

    // 2. Create or find auth user
    let authUserId: string;

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === invite.email);

    if (existingUser) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: { full_name: invite.name },
        }
      );
      if (updateError) {
        console.error("Error updating user:", updateError);
        return errorResponse("Erro ao configurar conta");
      }
      authUserId = existingUser.id;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: invite.name },
      });
      if (createError) {
        console.error("Error creating user:", createError);
        return errorResponse("Erro ao criar conta: " + createError.message);
      }
      authUserId = newUser.user.id;
    }

    // 3. Create seller record with approved status
    const { error: sellerError } = await supabaseAdmin
      .from("c2c_sellers")
      .insert({
        user_id: authUserId,
        workspace_id: invite.workspace_id,
        display_name: invite.name,
        phone: phone || null,
        iban: iban || null,
        bank_name: bank_name || null,
        account_holder: account_holder || null,
        nif: nif || null,
        bio: bio || null,
        location: location || null,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: invite.invited_by,
      });

    if (sellerError) {
      if (!sellerError.message?.includes("duplicate")) {
        console.error("Error creating seller:", sellerError);
      }
    }

    // 4. Mark invite as accepted
    await supabaseAdmin
      .from("c2c_seller_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    console.log("Seller invite activated:", { inviteId: invite.id, authUserId, email: invite.email });

    // 5. Send confirmation email (non-blocking)
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const [workspaceRes, storeRes] = await Promise.all([
          supabaseAdmin.from("workspaces").select("name, slug").eq("id", invite.workspace_id).single(),
          supabaseAdmin.from("store_settings").select("custom_domain, store_slug").eq("workspace_id", invite.workspace_id).maybeSingle(),
        ]);

        const workspaceName = workspaceRes.data?.name || "Marketplace";
        const slug = storeRes.data?.store_slug || workspaceRes.data?.slug || invite.workspace_id;
        const baseDomain = storeRes.data?.custom_domain
          ? `https://${storeRes.data.custom_domain}`
          : "https://fastcrm.metodopare.ai";
        const loginUrl = `${baseDomain}/c2c/${slug}/seller/${authUserId}`;

        const emailHtml = buildConfirmationEmail(invite.name, workspaceName, loginUrl);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${workspaceName} <noreply@m.fastcrm.metodopare.ai>`,
            to: [invite.email],
            subject: `Conta ativada - Bem-vindo ao ${workspaceName}!`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error("Failed to send confirmation email:", errBody);
        } else {
          console.log("Confirmation email sent to:", invite.email);
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping confirmation email");
      }
    } catch (emailError) {
      console.error("Error sending confirmation email (non-blocking):", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, data: { authUserId } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in activate-c2c-seller-invite:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
