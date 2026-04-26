// Edge Function: builder-import-url
// Faz fetch a uma URL pública, devolve HTML em bruto (não sanitizado).
// A sanitização final é feita no cliente antes de gravar em DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 15_000;

// Bloqueia hosts privados (SSRF guard básico)
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "::1") return true;
  if (h === "169.254.169.254") return true; // metadata
  // IPs privados IPv4
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

function absolutizeUrls(html: string, base: string): string {
  try {
    const baseUrl = new URL(base);
    return html
      .replace(/(\s(?:src|href))=("|')(?!https?:|data:|mailto:|tel:|#)([^"']+)\2/gi,
        (_m, attr, q, path) => {
          try {
            const abs = new URL(path, baseUrl).toString();
            return `${attr}=${q}${abs}${q}`;
          } catch {
            return _m;
          }
        });
  } catch {
    return html;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método inválido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as { url?: string } | null;
    const rawUrl = body?.url?.trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "URL em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "Apenas http/https" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isBlockedHost(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "Host bloqueado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "FastCRM-Builder/1.0 (+https://fastcrm.lovable.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (e) {
      clearTimeout(t);
      const msg = e instanceof Error ? e.message : "fetch falhou";
      return new Response(JSON.stringify({ error: `Não foi possível obter a URL: ${msg}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    clearTimeout(t);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Resposta ${res.status} da origem` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return new Response(JSON.stringify({ error: `Content-Type não suportado: ${ct || "?"}` }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Página demasiado grande (>5MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = new TextDecoder("utf-8").decode(buf);
    const absolute = absolutizeUrls(html, parsed.toString());

    // Tenta extrair <title>
    const titleMatch = absolute.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 160) : null;

    return new Response(
      JSON.stringify({
        html: absolute,
        title,
        sourceUrl: parsed.toString(),
        bytes: buf.byteLength,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
