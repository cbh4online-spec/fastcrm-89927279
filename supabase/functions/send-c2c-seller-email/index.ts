import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildConfirmationEmail(sellerName: string, workspaceName: string, loginUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Conta ativada - ${workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #2563eb; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0;">${workspaceName}</h1>
              <p style="color: #dbeafe; font-size: 14px; margin: 8px 0 0 0;">Marketplace</p>
            </td>
          </tr>
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seller_id, workspace_id } = await req.json();

    if (!seller_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "seller_id and workspace_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch seller, workspace, and store settings in parallel
    const [sellerRes, workspaceRes, storeRes] = await Promise.all([
      supabaseAdmin.from("c2c_sellers").select("display_name, user_id").eq("id", seller_id).single(),
      supabaseAdmin.from("workspaces").select("name, slug").eq("id", workspace_id).single(),
      supabaseAdmin.from("store_settings").select("custom_domain, store_slug").eq("workspace_id", workspace_id).maybeSingle(),
    ]);

    if (sellerRes.error || !sellerRes.data) {
      return new Response(
        JSON.stringify({ error: "Seller not found", details: sellerRes.error?.message }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get seller email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sellerRes.data.user_id);
    if (!authUser?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Seller email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sellerName = sellerRes.data.display_name || "Vendedor";
    const workspaceName = workspaceRes.data?.name || "Marketplace";
    const slug = storeRes.data?.store_slug || workspaceRes.data?.slug || workspace_id;
    const baseDomain = storeRes.data?.custom_domain
      ? `https://${storeRes.data.custom_domain}`
      : "https://fastcrm.metodopare.ai";
    const loginUrl = `${baseDomain}/c2c/${slug}/seller/${sellerRes.data.user_id}`;

    const emailHtml = buildConfirmationEmail(sellerName, workspaceName, loginUrl);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${workspaceName} <noreply@m.fastcrm.metodopare.ai>`,
        to: [authUser.user.email],
        subject: `Conta ativada - Bem-vindo ao ${workspaceName}!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Failed to send email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent to:", authUser.user.email, "Result:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: authUser.user.email,
        seller_name: sellerName,
        link: loginUrl,
        resend_id: emailResult.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
