// Edge function pública: recebe submissões do site marketing,
// cria lead em marketing_leads e dispara emails (prospect + interno) se possível.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface LeadInput {
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  company_size?: string;
  sector?: string;
  message?: string;
  source_page?: string;
  lead_type?: string;
  utm?: Record<string, string | undefined>;
  referrer?: string;
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clamp(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: LeadInput;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validação manual (zod indisponível no edge sem URL externa)
  const full_name = clamp(body.full_name, 120);
  const email = clamp(body.email, 200)?.toLowerCase();
  const phone = clamp(body.phone, 40);
  const company_name = clamp(body.company_name, 200);
  const company_size = clamp(body.company_size, 40);
  const sector = clamp(body.sector, 80);
  const message = clamp(body.message, 2000);
  const source_page = clamp(body.source_page, 80) ?? "home";
  const lead_type = clamp(body.lead_type, 30) ?? "contact";
  const referrer = clamp(body.referrer, 500);

  if (!full_name || full_name.length < 2) {
    return new Response(JSON.stringify({ error: "invalid_name" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!email || !isEmail(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!["demo", "contact", "resource", "pricing", "partnership"].includes(lead_type)) {
    return new Response(JSON.stringify({ error: "invalid_lead_type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const utm = body.utm ?? {};
  const ipHeader =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ipHash = await hashIp(ipHeader);
  const userAgent = clamp(req.headers.get("user-agent") ?? "", 500);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: lead, error } = await supabase
    .from("marketing_leads")
    .insert({
      full_name,
      email,
      phone,
      company_name,
      company_size,
      sector,
      message,
      source_page,
      lead_type,
      utm_source: clamp(utm.utm_source, 80),
      utm_medium: clamp(utm.utm_medium, 80),
      utm_campaign: clamp(utm.utm_campaign, 120),
      utm_content: clamp(utm.utm_content, 120),
      utm_term: clamp(utm.utm_term, 120),
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submit-marketing-lead] insert error", error);
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Tentar enviar emails (best-effort: não falha o lead se emails falharem)
  try {
    // Email de confirmação ao prospect
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "marketing-lead-confirmation",
        recipientEmail: email,
        idempotencyKey: `marketing-lead-confirm-${lead.id}`,
        templateData: {
          name: full_name,
          leadType: lead_type,
          companyName: company_name ?? "",
        },
      },
    });

    // Notificação interna (vai para email da equipa)
    const internalEmail = Deno.env.get("MARKETING_LEADS_NOTIFY_EMAIL") ?? "vendas@vendesimples.com";
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "marketing-lead-internal",
        recipientEmail: internalEmail,
        idempotencyKey: `marketing-lead-internal-${lead.id}`,
        templateData: {
          name: full_name,
          email,
          phone: phone ?? "",
          companyName: company_name ?? "",
          companySize: company_size ?? "",
          sector: sector ?? "",
          message: message ?? "",
          sourcePage: source_page,
          leadType: lead_type,
          leadId: lead.id,
        },
      },
    });
  } catch (e) {
    console.warn("[submit-marketing-lead] email dispatch failed (non-fatal)", e);
  }

  return new Response(JSON.stringify({ ok: true, id: lead.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
