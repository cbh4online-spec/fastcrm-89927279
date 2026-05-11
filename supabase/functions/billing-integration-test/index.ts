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

interface TestPayload {
  provider: string;
  account_name: string;
  api_key: string;
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

async function testInvoiceXpress(account: string, apiKey: string) {
  const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/users/me.json?api_key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* not json */
    }
    if (!r.ok) {
      return {
        ok: false,
        status: r.status,
        error:
          data?.errors?.error?.[0] ||
          data?.message ||
          `HTTP ${r.status} ${text.slice(0, 200)}`,
      };
    }
    const u = data?.user || data;
    return {
      ok: true,
      account_info: {
        name: u?.name || u?.first_name || null,
        email: u?.email || null,
        account: account,
      },
    };
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ ok: false, error: "Unauthorized" }, 200);

    const body = (await req.json()) as TestPayload;
    if (!body?.provider || !body?.account_name || !body?.api_key) {
      return json({ ok: false, error: "Campos provider, account_name e api_key são obrigatórios" }, 200);
    }
    const normalizedAccount = normalizeInvoiceXpressAccount(body.account_name);
    if (!normalizedAccount) {
      return json({ ok: false, error: "Nome da conta InvoiceXpress inválido" }, 200);
    }
    if (normalizedAccount.length > 80 || body.api_key.length > 200) {
      return json({ ok: false, error: "Valores demasiado longos" }, 200);
    }

    if (body.provider === "invoicexpress") {
      const result = await testInvoiceXpress(normalizedAccount, body.api_key.trim());
      return json(result, 200);
    }

    return json({ ok: false, error: `Provider '${body.provider}' ainda não suportado para teste` }, 200);
  } catch (e) {
    console.error("[billing-integration-test] internal_error", e);
    return json({ ok: false, error: "internal_error" }, 200);
  }
});
