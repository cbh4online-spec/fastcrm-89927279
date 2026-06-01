// Re-testa uma integração de faturação JÁ guardada (por id) e actualiza
// os campos last_check_at / last_check_status / last_check_error.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function testInvoiceXpress(account: string, apiKey: string) {
  const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/sequences.json?api_key=${encodeURIComponent(apiKey)}&page=1&per_page=1`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    const text = await r.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* not json */ }
    if (!r.ok) {
      return {
        ok: false,
        error:
          data?.errors?.error?.[0] ||
          data?.message ||
          `HTTP ${r.status} ${text.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha de rede ao contactar InvoiceXpress",
    };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 200);
    }

    // Cliente com JWT do utilizador para validar acesso via RLS
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ ok: false, error: "Unauthorized" }, 200);

    const body = await req.json().catch(() => ({}));
    const id = (body?.id ?? "").toString();
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return json({ ok: false, error: "Campo 'id' inválido" }, 200);
    }

    // Lê a integração com o contexto do utilizador (RLS valida acesso ao workspace)
    const { data: integ, error: iErr } = await userClient
      .from("workspace_billing_integrations")
      .select("id, workspace_id, provider, account_name, api_key_encrypted")
      .eq("id", id)
      .maybeSingle();

    if (iErr || !integ) {
      return json({ ok: false, error: "Integração não encontrada ou sem acesso" }, 200);
    }

    let result: { ok: boolean; error?: string };
    if (integ.provider === "invoicexpress") {
      result = await testInvoiceXpress(integ.account_name, (integ.api_key_encrypted || "").trim());
    } else {
      result = { ok: false, error: `Provider '${integ.provider}' ainda não suportado para teste` };
    }

    // Service role para gravar o resultado do check
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin
      .from("workspace_billing_integrations")
      .update({
        last_check_at: new Date().toISOString(),
        last_check_status: result.ok ? "ok" : "error",
        last_check_error: result.ok ? null : (result.error || "Erro desconhecido"),
      })
      .eq("id", id);

    return json(result, 200);
  } catch (e) {
    console.error("[billing-integration-recheck] internal_error", e);
    return json({ ok: false, error: "internal_error" }, 200);
  }
});
