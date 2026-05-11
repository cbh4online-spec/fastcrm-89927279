import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ProxyPayload {
  integration_id: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // e.g. /clients.json or /invoices/123.json
  body?: unknown;
  query?: Record<string, string>;
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

    const payload = (await req.json()) as ProxyPayload;
    if (!payload?.integration_id || !payload?.path) {
      return json({ ok: false, error: "integration_id e path são obrigatórios" }, 200);
    }
    if (!/^\/[a-zA-Z0-9_\-./]+$/.test(payload.path)) {
      return json({ ok: false, error: "path inválido" }, 200);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integ, error } = await admin
      .from("workspace_billing_integrations")
      .select("workspace_id, provider, account_name, api_key_encrypted, is_active")
      .eq("id", payload.integration_id)
      .maybeSingle();
    if (error || !integ) return json({ ok: false, error: "Integração não encontrada" }, 200);
    if (!integ.is_active) return json({ ok: false, error: "Integração desativada" }, 200);

    // Authorization: user must be admin of integ.workspace_id (or super)
    const { data: isAdmin } = await userClient.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: integ.workspace_id,
    });
    const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: userId });
    if (!isAdmin && !isSuper) return json({ ok: false, error: "Sem permissão" }, 200);

    if (integ.provider !== "invoicexpress") {
      return json({ ok: false, error: `Provider '${integ.provider}' ainda não suportado` }, 200);
    }

    const qs = new URLSearchParams({ api_key: integ.api_key_encrypted, ...(payload.query || {}) });
    const url = `https://${encodeURIComponent(integ.account_name)}.app.invoicexpress.com${payload.path}?${qs.toString()}`;

    const method = payload.method || "GET";
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    let upstreamStatus = 0;
    let upstreamBody: any = null;
    try {
      const r = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: method === "GET" ? undefined : JSON.stringify(payload.body ?? {}),
        signal: ctrl.signal,
      });
      upstreamStatus = r.status;
      const txt = await r.text();
      try {
        upstreamBody = JSON.parse(txt);
      } catch {
        upstreamBody = txt;
      }
    } finally {
      clearTimeout(t);
    }

    return json({ ok: upstreamStatus >= 200 && upstreamStatus < 300, status: upstreamStatus, data: upstreamBody }, 200);
  } catch (e) {
    console.error("[invoicexpress-proxy] internal_error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "internal_error" }, 200);
  }
});
