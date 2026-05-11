import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SavePayload {
  id?: string;
  workspace_id: string;
  provider: string;
  display_name?: string;
  account_name: string;
  api_key?: string; // optional on update if user keeps existing
  config?: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
  skip_test?: boolean;
}

function normalizeInvoiceXpressAccount(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.match(/^https?:\/\//) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host.endsWith(".app.invoicexpress.com")) return host.replace(/\.app\.invoicexpress\.com$/, "");
    if (!host.includes(".")) return host;
  } catch {
    // plain account name
  }
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.app\.invoicexpress\.com.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
}

async function testProvider(provider: string, account: string, apiKey: string) {
  if (provider !== "invoicexpress") return { ok: true, skipped: true };
  const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/sequences.json?api_key=${encodeURIComponent(apiKey)}&page=1&per_page=1`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!r.ok) {
      const text = await r.text();
      return { ok: false, error: `HTTP ${r.status} ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 200);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ ok: false, error: "Unauthorized" }, 200);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as SavePayload;
    if (!body.workspace_id || !body.provider || !body.account_name) {
      return json({ ok: false, error: "Campos obrigatórios em falta" }, 200);
    }
    const accountName = body.provider === "invoicexpress"
      ? normalizeInvoiceXpressAccount(body.account_name)
      : body.account_name.trim();
    if (!accountName) return json({ ok: false, error: "Nome da conta inválido" }, 200);
    if (accountName.length > 80) return json({ ok: false, error: "Nome da conta demasiado longo" }, 200);

    // Permission check via RPC
    const { data: isAdmin } = await userClient.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: body.workspace_id,
    });
    const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: userId });
    if (!isAdmin && !isSuper) {
      return json({ ok: false, error: "Sem permissão neste workspace" }, 200);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve api_key to use (existing if not provided on update)
    let apiKey = (body.api_key || "").trim();
    if (body.id && !apiKey) {
      const { data: existing } = await admin
        .from("workspace_billing_integrations")
        .select("api_key_encrypted")
        .eq("id", body.id)
        .maybeSingle();
      apiKey = existing?.api_key_encrypted || "";
    }
    if (!apiKey) return json({ ok: false, error: "API key obrigatória" }, 200);

    // Test connection (unless skipped)
    let last_check_status = "untested";
    let last_check_error: string | null = null;
    if (!body.skip_test) {
      const t = await testProvider(body.provider, accountName, apiKey);
      last_check_status = t.ok ? "ok" : "error";
      last_check_error = t.ok ? null : (t as any).error || "unknown";
      if (!t.ok && !body.id) {
        // Don't create a broken integration
        return json({ ok: false, error: last_check_error }, 200);
      }
    }

    const row = {
      workspace_id: body.workspace_id,
      provider: body.provider,
      display_name: body.display_name?.trim() || null,
      account_name: accountName,
      api_key_encrypted: apiKey,
      config: body.config || {},
      is_active: body.is_active ?? true,
      is_default: body.is_default ?? false,
      last_check_at: new Date().toISOString(),
      last_check_status,
      last_check_error,
      created_by: userId,
    };

    let saved;
    if (body.id) {
      const { data, error } = await admin
        .from("workspace_billing_integrations")
        .update(row)
        .eq("id", body.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await admin
        .from("workspace_billing_integrations")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      saved = data;
    }

    return json({ ok: true, id: saved?.id, last_check_status, last_check_error }, 200);
  } catch (e) {
    console.error("[billing-integration-save] internal_error", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "internal_error" },
      200,
    );
  }
});
