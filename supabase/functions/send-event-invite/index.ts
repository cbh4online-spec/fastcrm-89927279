import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EventInviteRequest {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string | null;
  eventLink?: string | null;
  eventId: string;
  workspaceId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("[EVENT-INVITE] No RESEND_API_KEY configured, skipping");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EventInviteRequest = await req.json();
    const { email, name, eventTitle, eventDate, eventLocation, eventLink, eventId } = body;

    if (!email || !eventTitle || !eventDate) {
      throw new Error("Missing required fields: email, eventTitle, eventDate");
    }

    const resend = new Resend(resendKey);

    const dateFormatted = new Date(eventDate).toLocaleDateString("pt-PT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const locationHtml = eventLocation
      ? `<tr><td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
           <span style="color:#71717a;font-size:14px;">📍 Local</span><br/>
           <span style="color:#18181b;font-size:16px;font-weight:500;">${eventLocation}</span>
         </td></tr>`
      : "";

    const linkHtml = eventLink
      ? `<tr><td style="padding:12px 0;">
           <span style="color:#71717a;font-size:14px;">🔗 Link</span><br/>
           <a href="${eventLink}" style="color:#6366f1;font-size:14px;">${eventLink}</a>
         </td></tr>`
      : "";

    const baseUrl = "https://fastcrm.metodopare.ai";
    const eventUrl = `${baseUrl}/dashboard/events/${eventId}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:40px 0;">
          <table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:40px 40px 20px;text-align:center;background-color:#6366f1;border-radius:12px 12px 0 0;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">📅 Convite para Evento</h1>
                <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">${eventTitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 20px;color:#18181b;font-size:20px;font-weight:600;">Olá ${name || ""}!</h2>
                <p style="margin:0 0 24px;color:#52525b;font-size:16px;line-height:1.6;">
                  Foi convidado(a) para o evento <strong>${eventTitle}</strong>. Aqui estão os detalhes:
                </p>
                <table role="presentation" style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;padding:16px;">
                  <tr><td style="padding:16px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
                        <span style="color:#71717a;font-size:14px;">📅 Data e hora</span><br/>
                        <span style="color:#18181b;font-size:16px;font-weight:500;">${dateFormatted}</span>
                      </td></tr>
                      ${locationHtml}
                      ${linkHtml}
                    </table>
                  </td></tr>
                </table>
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                  <tr><td align="center" style="padding:30px 0 10px;">
                    <a href="${eventUrl}" style="display:inline-block;padding:14px 36px;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px;">
                      Ver Evento
                    </a>
                  </td></tr>
                </table>
                <p style="margin:20px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">
                  Se não conseguir clicar no botão, <a href="${eventUrl}" style="color:#6366f1;">clique aqui</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
                <p style="margin:0;color:#a1a1aa;font-size:13px;text-align:center;">
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
      from: `Eventos <noreply@m.fastcrm.metodopare.ai>`,
      to: [email],
      subject: `Convite: ${eventTitle}`,
      html: emailHtml,
    });

    console.log("[EVENT-INVITE] Email sent to", email, emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[EVENT-INVITE] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
