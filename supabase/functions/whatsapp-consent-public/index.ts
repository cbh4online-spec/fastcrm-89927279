// FastCRM — Opt-in público de WhatsApp por token opaco.
// Nunca expõe IDs internos (workspace, lead, campanha) e é fail-closed:
// sem token válido e ativo, nada é resolvido nem gravado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ResolveSchema = z.object({
  action: z.literal("resolve"),
  token: z.string().min(16).max(80),
});

const SubmitSchema = z.object({
  action: z.literal("submit"),
  token: z.string().min(16).max(80),
  name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().min(6).max(32),
  country: z.string().trim().length(2).optional().nullable(),
  accepted: z.boolean(),
});

const RevokeSchema = z.object({
  action: z.literal("revoke"),
  token: z.string().min(16).max(80),
  phone: z.string().min(6).max(32),
});

const BodySchema = z.discriminatedUnion("action", [ResolveSchema, SubmitSchema, RevokeSchema]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normaliza para E.164. `country` só é usado quando não há indicativo. */
export function normalizeE164(raw: string, country?: string | null): string | null {
  let value = (raw || "").trim().replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;
    const cc = (country ?? "PT").toUpperCase() === "PT" ? "351" : null;
    if (digits.length === 9 && cc) value = `+${cc}${digits}`;
    else if (digits.length >= 10) value = `+${digits}`;
    else return null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return `+${digits}`;
}

async function hashKey(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Rate limit simples por IP+token (janela deslizante de 10 min). */
async function rateLimited(
  admin: ReturnType<typeof createClient>,
  key: string,
  max: number,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const { data } = await admin
    .from("edge_function_rate_limits")
    .select("rate_key, request_count, window_start")
    .eq("rate_key", key)
    .maybeSingle();

  if (!data || now - new Date(data.window_start as string).getTime() > windowMs) {
    await admin
      .from("edge_function_rate_limits")
      .upsert({ rate_key: key, request_count: 1, window_start: new Date().toISOString() });
    return false;
  }
  if ((data.request_count as number) >= max) return true;
  await admin
    .from("edge_function_rate_limits")
    .update({ request_count: (data.request_count as number) + 1 })
    .eq("rate_key", key);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "invalid_request" }, 400);
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      "unknown";
    const ipKey = await hashKey(ip);

    if (await rateLimited(admin, `wa-consent:${body.action}:${ipKey}`, body.action === "resolve" ? 60 : 8)) {
      return json({ error: "rate_limited" }, 429);
    }

    const { data: link } = await admin
      .from("whatsapp_consent_links")
      .select(
        "id, workspace_id, label, brand_name, campaign_reference, consent_category, consent_text, consent_version, privacy_policy_url, is_active, expires_at, submission_count",
      )
      .eq("token", body.token)
      .maybeSingle();

    // Fail-closed e resposta uniforme: não permite enumerar tokens.
    if (!link || link.is_active !== true || (link.expires_at && new Date(link.expires_at as string) < new Date())) {
      return json({ error: "link_unavailable" }, 404);
    }

    if (body.action === "resolve") {
      return json({
        ok: true,
        link: {
          label: link.label,
          brand_name: link.brand_name,
          consent_text: link.consent_text,
          consent_version: link.consent_version,
          privacy_policy_url: link.privacy_policy_url,
        },
      });
    }

    const phone = normalizeE164(body.phone, "country" in body ? body.country : null);
    if (!phone) return json({ error: "invalid_phone" }, 400);
    const digits = phone.replace(/\D/g, "");
    const workspaceId = link.workspace_id as string;
    const now = new Date().toISOString();

    if (body.action === "revoke") {
      await admin
        .from("whatsapp_consents")
        .update({ status: "revoked", revoked_at: now, updated_at: now })
        .eq("workspace_id", workspaceId)
        .eq("phone", phone);
      await admin
        .from("whatsapp_optouts")
        .upsert(
          { workspace_id: workspaceId, phone: digits, source: "manual", reason: "public_revoke" },
          { onConflict: "workspace_id,phone" },
        );
      return json({ ok: true, revoked: true });
    }

    // submit
    if (!body.accepted) return json({ ok: true, recorded: false, reason: "not_accepted" });

    // Associação à Lead existente apenas dentro do mesmo workspace (nunca cria registos novos).
    const { data: leads } = await admin
      .from("leads")
      .select("id, phone")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .not("phone", "is", null)
      .ilike("phone", `%${digits.slice(-9)}%`)
      .limit(20);
    const leadId =
      (leads ?? []).find((l) => (l.phone ?? "").replace(/\D/g, "").endsWith(digits.slice(-9)))?.id ?? null;

    const { error } = await admin.from("whatsapp_consents").upsert(
      {
        workspace_id: workspaceId,
        phone,
        lead_id: leadId,
        status: "granted",
        consent_category: link.consent_category,
        consent_text: link.consent_text,
        consent_version: link.consent_version,
        source: "landing_page",
        source_reference: (link.campaign_reference as string | null) ?? (link.label as string),
        granted_at: now,
        revoked_at: null,
        ip_address: ipKey.slice(0, 32),
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
        metadata: { consent_link_id: link.id, name: body.name?.slice(0, 120) ?? null },
        updated_at: now,
      },
      { onConflict: "workspace_id,phone,consent_category" },
    );
    if (error) {
      console.error("[wa-consent-public] upsert", error.message);
      return json({ ok: false, internal_error: true });
    }

    // Um opt-in explícito posterior reverte um opt-out anterior.
    await admin.from("whatsapp_optouts").delete().eq("workspace_id", workspaceId).eq("phone", digits);
    await admin
      .from("whatsapp_consent_links")
      .update({ submission_count: (link.submission_count as number) + 1, updated_at: now })
      .eq("id", link.id);

    return json({ ok: true, recorded: true });
  } catch (e) {
    console.error("[wa-consent-public] fatal", (e as Error).message);
    return json({ ok: false, fallback: true, error: "internal_error" });
  }
});
