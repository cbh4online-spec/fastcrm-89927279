import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { ebook_id, lead_email, lead_name, ebook_url } = await req.json();
    if (!ebook_id || !lead_email) {
      return new Response(JSON.stringify({ ok: true, skipped: "missing fields" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: ebook } = await supabase
      .from("ebooks")
      .select("title, slug, cover_url, welcome_email_enabled, welcome_email_subject, welcome_email_body, author_name")
      .eq("id", ebook_id)
      .maybeSingle();

    if (!ebook?.welcome_email_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "welcome email disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.warn("[ebook-lead-welcome] Missing keys");
      return new Response(JSON.stringify({ ok: true, skipped: "missing api keys" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const vars = {
      name: lead_name || "Olá",
      ebook_title: ebook.title || "eBook",
      ebook_url: ebook_url || "",
    };

    const subject = renderTemplate(ebook.welcome_email_subject || `O seu eBook: ${ebook.title}`, vars);
    const bodyText = renderTemplate(
      ebook.welcome_email_body ||
        `Olá {{name}},\n\nObrigado pelo interesse no eBook "{{ebook_title}}".\n\nPode acedê-lo aqui: {{ebook_url}}\n\nCumprimentos`,
      vars
    );

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      ${ebook.cover_url ? `<img src="${ebook.cover_url}" alt="${ebook.title}" style="max-width:160px;border-radius:8px;margin-bottom:16px"/>` : ""}
      <h2 style="margin:0 0 12px">${ebook.title}</h2>
      <p style="white-space:pre-wrap;line-height:1.5">${bodyText.replace(/\n/g, "<br/>")}</p>
      ${ebook_url ? `<p style="margin-top:24px"><a href="${ebook_url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Abrir eBook</a></p>` : ""}
    </div>`;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${ebook.author_name || "eBook"} <onboarding@resend.dev>`,
        to: [lead_email],
        subject,
        html,
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("ebook-lead-welcome error:", err);
    return new Response(JSON.stringify({ ok: true, fallback: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
