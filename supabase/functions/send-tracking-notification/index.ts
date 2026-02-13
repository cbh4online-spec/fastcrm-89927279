import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("[TRACKING-EMAIL] No RESEND_API_KEY configured, skipping");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customerEmail, customerName, orderNumber, trackingNumber, trackingCarrier, trackingUrl } = await req.json();

    if (!customerEmail || !trackingNumber) {
      throw new Error("Missing required fields");
    }

    const resend = new Resend(resendKey);

    const trackingLink = trackingUrl
      ? `<p style="margin:20px 0"><a href="${trackingUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Rastrear Encomenda</a></p>`
      : "";

    await resend.emails.send({
      from: "Loja <noreply@updates.fastcrm.pt>",
      to: [customerEmail],
      subject: `A sua encomenda${orderNumber ? ` #${orderNumber}` : ""} foi enviada! 📦`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h1 style="color:#333">A sua encomenda foi enviada!</h1>
          <p>Olá ${customerName},</p>
          <p>Temos boas notícias — a sua encomenda${orderNumber ? ` <strong>#${orderNumber}</strong>` : ""} está a caminho!</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px"><strong>Transportadora:</strong> ${trackingCarrier}</p>
            <p style="margin:0"><strong>Nº de Tracking:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${trackingNumber}</code></p>
          </div>
          ${trackingLink}
          <p style="color:#666;font-size:14px">Se tiver alguma questão, não hesite em contactar-nos.</p>
        </div>
      `,
    });

    console.log("[TRACKING-EMAIL] Notification sent to", customerEmail);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TRACKING-EMAIL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
