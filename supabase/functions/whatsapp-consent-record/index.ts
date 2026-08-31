// FastCRM — Registo público de consentimento WhatsApp
// Recebe submissões de formulários / landing pages e grava prova em whatsapp_consents.
// Nunca confia no frontend: valida input, normaliza telefone e captura IP/User-Agent server-side.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONSENT_TEXT =
  "Autorizo a myMIA a enviar-me pelo WhatsApp informações, conteúdos, novidades e ofertas relacionadas com os seus produtos e serviços. " +
  "Posso retirar o consentimento a qualquer momento respondendo STOP. Consulte a nossa Política de Privacidade.";

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  phone: z.string().min(6).max(32),
  accepted: z.boolean(),
  source: z.enum(["form", "landing_page", "email", "whatsapp_inbound", "manual_import"]),
  source_reference: z.string().max(255).optional().nullable(),
  consent_version: z.string().max(40).optional(),
  consent_category: z.enum(["marketing", "transactional", "all"]).default("marketing"),
  contact_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normaliza para E.164 assumindo Portugal quando não há indicativo. */
function normalizePhone(raw: string): string | null {
  let digits = (raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    const only = digits.replace(/\D/g, "");
    if (only.length === 9) digits = `+351${only}`;
    else if (only.length > 9) digits = `+${only}`;
    else return null;
  }
  const only = digits.replace(/\D/g, "");
  if (only.length < 9 || only.length > 15) return null;
  return `+${only}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const b = parsed.data;

    if (!b.accepted) {
      // Consentimento não dado — nada é gravado (nunca ativar automaticamente).
      return json({ ok: true, recorded: false, reason: "not_accepted" });
    }

    const phone = normalizePhone(b.phone);
    if (!phone) return json({ error: { phone: ["Telefone inválido"] } }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Workspace tem de existir (fail-closed)
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("id", b.workspace_id)
      .maybeSingle();
    if (!ws) return json({ error: "workspace_not_found" }, 404);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const now = new Date().toISOString();

    const { error } = await admin
      .from("whatsapp_consents")
      .upsert(
        {
          workspace_id: b.workspace_id,
          phone,
          contact_id: b.contact_id ?? null,
          lead_id: b.lead_id ?? null,
          company_id: b.company_id ?? null,
          status: "granted",
          consent_category: b.consent_category,
          consent_text: CONSENT_TEXT,
          consent_version: b.consent_version ?? "v1-2026-08",
          source: b.source,
          source_reference: b.source_reference ?? null,
          granted_at: now,
          revoked_at: null,
          ip_address: ip,
          user_agent: userAgent,
          metadata: b.metadata ?? {},
          updated_at: now,
        },
        { onConflict: "workspace_id,phone,consent_category" },
      );

    if (error) {
      console.error("[wa-consent] upsert error", error.message);
      return json({ ok: false, internal_error: error.message });
    }

    // Consentimento explícito reverte um opt-out anterior para esse número.
    await admin
      .from("whatsapp_optouts")
      .delete()
      .eq("workspace_id", b.workspace_id)
      .eq("phone", phone.replace(/\D/g, ""));

    return json({ ok: true, recorded: true, phone });
  } catch (e) {
    console.error("[wa-consent] fatal", (e as Error).message);
    return json({ ok: false, fallback: true, error: "internal_error" });
  }
});
