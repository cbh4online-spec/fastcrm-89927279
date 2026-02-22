import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  role: string;
  workspaceId: string;
  domain: string;
}

function buildInviteEmail(workspaceName: string, role: string, inviteUrl: string): string {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    agent: "Agente",
    viewer: "Visualizador",
  };
  const roleLabel = roleLabels[role] || role;

  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite para ${workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #2563eb; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0;">${workspaceName}</h1>
              <p style="color: #dbeafe; font-size: 14px; margin: 8px 0 0 0;">Equipa</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <h2 style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">Olá,</h2>
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                      Foi convidado(a) a juntar-se à equipa do <strong>${workspaceName}</strong> como <strong>${roleLabel}</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 8px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">
                            Aceitar Convite
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                      Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br />
                      <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                Este convite expira em 7 dias. Se não reconhece este convite, pode ignorar este email.
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 12px 0 0 0;">
                Enviado por ${workspaceName} através da plataforma FastCRM.
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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { email, role, workspaceId, domain }: InviteRequest = await req.json();
    if (!email || !workspaceId || !domain) throw new Error("email, workspaceId e domain são obrigatórios");

    // Check membership
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin", "agency"].includes(membership.role)) {
      throw new Error("Sem permissão para convidar membros");
    }

    // Get workspace name
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();
    if (!workspace) throw new Error("Workspace não encontrado");

    // Check if already a member
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingProfile.user_id)
        .maybeSingle();
      if (existingMember) throw new Error("Este utilizador já é membro do workspace");
    }

    // Delete any existing pending invite for this email
    await supabaseAdmin
      .from("workspace_invites")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("email", email.trim().toLowerCase())
      .eq("status", "pending");

    // Create invite
    const { data: invite, error: insertError } = await supabaseAdmin
      .from("workspace_invites")
      .insert({
        workspace_id: workspaceId,
        email: email.trim().toLowerCase(),
        role: role || "agent",
        invited_by: user.id,
      })
      .select("invite_token")
      .single();

    if (insertError) throw new Error(insertError.message);

    const inviteUrl = `${domain}/invite/${invite.invite_token}`;
    const emailHtml = buildInviteEmail(workspace.name, role || "agent", inviteUrl);

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${workspace.name} <noreply@m.fastcrm.metodopare.ai>`,
        to: [email.trim()],
        subject: `Convite para a equipa ${workspace.name}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      throw new Error("Erro ao enviar email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-workspace-invite:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

Deno.serve(handler);
