import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  name: string;
  contactId?: string | null;
  workspaceId: string;
  communitySlug: string;
  communityName: string;
  communityLogo?: string | null;
  primaryColor?: string;
  invitedBy: string;
  resend?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InviteRequest = await req.json();
    const {
      email, name, contactId, workspaceId, communitySlug,
      communityName, communityLogo, primaryColor = "#6366f1",
      invitedBy, resend: isResend,
    } = body;

    if (!email || !name || !workspaceId || !communitySlug) {
      throw new Error("Missing required fields: email, name, workspaceId, communitySlug");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let inviteToken: string;

    if (isResend) {
      // Update existing record with new token and expiry
      const { data: existing, error: findErr } = await supabase
        .from("community_members")
        .select("id, invite_token")
        .eq("workspace_id", workspaceId)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (findErr || !existing) throw new Error("Convite pendente não encontrado");

      const newToken = crypto.randomUUID();
      const { error: updateErr } = await supabase
        .from("community_members")
        .update({
          invite_token: newToken,
          invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;
      inviteToken = newToken;
    } else {
      // Create new community_members record
      const { data: member, error: insertErr } = await supabase
        .from("community_members")
        .insert({
          workspace_id: workspaceId,
          email,
          name,
          contact_id: contactId || null,
          invited_by: invitedBy,
          status: "pending",
        })
        .select("invite_token")
        .single();

      if (insertErr) {
        if (insertErr.code === "23505") {
          throw new Error(`${email} já foi convidado para esta comunidade`);
        }
        throw insertErr;
      }
      inviteToken = member.invite_token;
    }

    // Build invite URL
    const baseUrl = "https://fastcrm.lovable.app";
    const inviteUrl = `${baseUrl}/community/${communitySlug}/auth?invite=${inviteToken}`;

    // Logo HTML
    const logoHtml = communityLogo
      ? `<img src="${communityLogo}" alt="${communityName}" style="max-height: 60px; margin-bottom: 10px; border-radius: 12px;" />`
      : "";

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:40px 0;">
          <table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);border-radius:12px 12px 0 0;">
                ${logoHtml}
                <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">${communityName}</h1>
                <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Convite para a Comunidade</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:600;">Olá ${name}!</h2>
                <p style="margin:0 0 20px;color:#52525b;font-size:16px;line-height:1.6;">
                  Foi convidado(a) para se juntar à comunidade <strong>${communityName}</strong>. 
                  Crie a sua conta para participar nas discussões, eventos e muito mais.
                </p>
                <p style="margin:0 0 30px;color:#52525b;font-size:16px;line-height:1.6;">
                  Na comunidade, poderá:
                </p>
                <ul style="margin:0 0 30px;padding-left:20px;color:#52525b;font-size:16px;line-height:1.8;">
                  <li>Participar em discussões e tópicos</li>
                  <li>Aceder a eventos exclusivos</li>
                  <li>Acumular pontos e subir de nível</li>
                  <li>Conectar-se com outros membros</li>
                </ul>
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                  <tr><td align="center" style="padding:20px 0;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px;box-shadow:0 4px 14px ${primaryColor}66;">
                      Juntar-se à Comunidade
                    </a>
                  </td></tr>
                </table>
                <p style="margin:30px 0 0;color:#71717a;font-size:14px;line-height:1.6;">
                  Se não conseguir clicar no botão, copie e cole este link:<br>
                  <a href="${inviteUrl}" style="color:${primaryColor};">${inviteUrl}</a>
                </p>
                <p style="margin:15px 0 0;color:#a1a1aa;font-size:12px;">
                  Este convite expira em 7 dias.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
                <p style="margin:0;color:#a1a1aa;font-size:13px;text-align:center;line-height:1.6;">
                  Este email foi enviado por ${communityName}.<br>
                  Se não esperava este convite, pode ignorar este email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    const emailResponse = await resend.emails.send({
      from: `${communityName} <noreply@m.fastcrm.metodopare.ai>`,
      to: [email],
      subject: `Convite para ${communityName}`,
      html: emailHtml,
    });

    console.log("Community invite email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-community-invite:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
