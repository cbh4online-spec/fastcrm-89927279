// Edge Function: builder-site-discover
// Recebe uma URL → usa Firecrawl /map para listar URLs do site +
// faz scrape da home para extrair branding (cores/fontes/logo).
// Devolve a lista (sem clonar nada ainda) para o utilizador confirmar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const FIRECRAWL_V1 = "https://api.firecrawl.dev/v1";
const MAX_PAGES = 200;

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "169.254.169.254") return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

async function firecrawl<T>(
  base: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY não está configurado.");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${t.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function pollCrawl(jobId: string, maxMs = 25_000): Promise<string[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY")!;
  const start = Date.now();
  const seen = new Set<string>();
  while (Date.now() - start < maxMs) {
    const res = await fetch(`${FIRECRAWL_V2}/crawl/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) break;
    const j = (await res.json()) as {
      status?: string;
      data?: Array<{ metadata?: { sourceURL?: string; url?: string } }>;
    };
    for (const d of j.data ?? []) {
      const u = d.metadata?.sourceURL ?? d.metadata?.url;
      if (u) seen.add(u);
    }
    if (j.status === "completed" || j.status === "failed") break;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return Array.from(seen);
}

function pickColors(html: string): string[] {
  const set = new Set<string>();
  const hexRe = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;
  let m;
  while ((m = hexRe.exec(html)) && set.size < 20) set.add(m[0].toLowerCase());
  return Array.from(set).slice(0, 12);
}
function pickFonts(html: string): string[] {
  const set = new Set<string>();
  const ff = /font-family\s*:\s*([^;"]+)/gi;
  let m;
  while ((m = ff.exec(html)) && set.size < 10) {
    const f = m[1].split(",")[0].trim().replace(/['"]/g, "");
    if (f.length > 0 && f.length < 60) set.add(f);
  }
  // Google fonts links
  const gf = /fonts\.googleapis\.com\/css2?\?family=([^"'&\s]+)/gi;
  while ((m = gf.exec(html)) && set.size < 15) {
    set.add(decodeURIComponent(m[1]).split(":")[0].replace(/\+/g, " "));
  }
  return Array.from(set).slice(0, 8);
}
function pickLogo(html: string, base: string): string | null {
  // 1) <link rel="icon"> 2) og:image 3) primeira <img> com "logo" no nome
  const rel = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)/i);
  if (rel) return new URL(rel[1], base).toString();
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
  if (og) return new URL(og[1], base).toString();
  const img = html.match(/<img[^>]+src=["']([^"']*logo[^"']*)["']/i);
  if (img) return new URL(img[1], base).toString();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return json({ error: "Método inválido" }, 405);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u, error: uerr } = await supa.auth.getUser();
    if (uerr || !u?.user) return json({ error: "Sessão inválida" }, 401);

    const body = (await req.json().catch(() => null)) as
      | { url?: string; includeSubdomains?: boolean }
      | null;
    const raw = body?.url?.trim();
    if (!raw) return json({ error: "URL em falta" }, 400);

    let parsed: URL;
    try { parsed = new URL(raw); } catch { return json({ error: "URL inválida" }, 400); }
    if (!["http:", "https:"].includes(parsed.protocol))
      return json({ error: "Apenas http/https" }, 400);
    if (isBlockedHost(parsed.hostname)) return json({ error: "Host bloqueado" }, 400);

    const root = parsed.hostname.replace(/^www\./, "");
    const sameHost = (l: string): boolean => {
      try {
        const u = new URL(l);
        if (!["http:", "https:"].includes(u.protocol)) return false;
        const host = u.hostname.replace(/^www\./, "");
        return body?.includeSubdomains ? host.endsWith(root) : host === root;
      } catch {
        return false;
      }
    };

    const collected = new Set<string>();
    const sources: string[] = [];

    // 1) Firecrawl v2 /map com sitemap include (apanha sitemap.xml)
    try {
      const m2 = await firecrawl<{ success?: boolean; links?: Array<string | { url: string }>; error?: string }>(
        FIRECRAWL_V2,
        "/map",
        {
          url: parsed.toString(),
          limit: MAX_PAGES,
          includeSubdomains: !!body?.includeSubdomains,
          sitemap: "include",
        },
      );
      for (const item of m2.links ?? []) {
        const u = typeof item === "string" ? item : item?.url;
        if (u && sameHost(u)) collected.add(u);
      }
      sources.push(`map-v2:${collected.size}`);
    } catch (e) {
      sources.push(`map-v2-fail:${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
    }

    // 2) Fallback para v1 /map se v2 falhou
    if (collected.size <= 1) {
      try {
        const m1 = await firecrawl<{ success: boolean; links?: string[]; error?: string }>(
          FIRECRAWL_V1,
          "/map",
          { url: parsed.toString(), limit: MAX_PAGES, includeSubdomains: !!body?.includeSubdomains },
        );
        for (const l of m1.links ?? []) if (sameHost(l)) collected.add(l);
        sources.push(`map-v1:${collected.size}`);
      } catch (e) {
        sources.push(`map-v1-fail:${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
      }
    }

    // 3) Fallback para crawl (segue links HTML) se ainda muito poucas páginas
    if (collected.size <= 1) {
      try {
        const job = await firecrawl<{ id?: string; jobId?: string; error?: string }>(
          FIRECRAWL_V2,
          "/crawl",
          {
            url: parsed.toString(),
            limit: 60,
            maxDepth: 3,
            scrapeOptions: { formats: ["links"] },
            allowExternalLinks: false,
          },
        );
        const id = job.id ?? job.jobId;
        if (id) {
          const found = await pollCrawl(id, 28_000);
          for (const l of found) if (sameHost(l)) collected.add(l);
          sources.push(`crawl:${collected.size}`);
        }
      } catch (e) {
        sources.push(`crawl-fail:${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
      }
    }

    // 4) Fallback final: scrape home, extrai todos os <a href> internos
    if (collected.size <= 1) {
      try {
        const sc = await firecrawl<{ success?: boolean; data?: { html?: string; links?: string[] } }>(
          FIRECRAWL_V2,
          "/scrape",
          { url: parsed.toString(), formats: ["html", "links"], onlyMainContent: false },
        );
        for (const l of sc?.data?.links ?? []) if (sameHost(l)) collected.add(l);
        const html = sc?.data?.html ?? "";
        const re = /<a[^>]+href=["']([^"']+)["']/gi;
        let m;
        while ((m = re.exec(html))) {
          try {
            const abs = new URL(m[1], parsed.toString()).toString().split("#")[0];
            if (sameHost(abs)) collected.add(abs);
          } catch { /* ignore */ }
        }
        sources.push(`scrape-links:${collected.size}`);
      } catch (e) {
        sources.push(`scrape-fail:${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
      }
    }

    // Garante que a home está incluída
    collected.add(parsed.toString());

    const links = Array.from(collected).slice(0, MAX_PAGES);
    console.log(`[discover] ${parsed.hostname} → ${links.length} URLs (${sources.join(" | ")})`);

    // Scrape rápido da home p/ branding
    let branding: { colors: string[]; fonts: string[]; logo: string | null } = {
      colors: [], fonts: [], logo: null,
    };
    try {
      const sc = await firecrawl<{ success?: boolean; data?: { html?: string } }>(
        FIRECRAWL_V2,
        "/scrape",
        { url: parsed.toString(), formats: ["html"], onlyMainContent: false, timeout: 20000 },
      );
      const html = sc?.data?.html ?? "";
      if (html) {
        branding = {
          colors: pickColors(html),
          fonts: pickFonts(html),
          logo: pickLogo(html, parsed.toString()),
        };
      }
    } catch { /* branding é best-effort */ }

    return json({
      sourceUrl: parsed.toString(),
      host: parsed.hostname,
      pages: links,
      pagesCount: links.length,
      branding,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
