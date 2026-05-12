// @ts-nocheck — tabelas builder_* não estão nos types gerados pelo Supabase
// Edge Function: builder-site-clone
// Clona um site completo: cria builder_sites + builder_assets agregador,
// faz scrape de cada página via Firecrawl, baixa assets binários para o
// bucket builder-site-assets, re-escreve URLs internas e guarda o HTML.
//
// Estratégia de timeout: usa EdgeRuntime.waitUntil para correr em background
// após responder ao cliente. Progresso fica visível via Realtime nas tabelas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const MAX_PAGES_HARD = 100;
const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10 MB
const ASSET_TIMEOUT = 12_000;
const BUCKET = "builder-site-assets";

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

function slugify(s: string, fallback = "page"): string {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || fallback;
}

function pathToSlug(u: URL): { path: string; slug: string; isHome: boolean } {
  const path = u.pathname.replace(/\/+$/, "") || "/";
  const hash = (u.hash || "").replace(/^#/, "").trim();
  if (hash) {
    // Fragmento → tratar como página/secção separada
    const base = path === "/" ? "" : path;
    return {
      path: `${base}#${hash}`,
      slug: slugify(`${base.replace(/^\//, "") || "home"}-${hash}`),
      isHome: false,
    };
  }
  if (path === "/" || path === "") return { path: "/", slug: "home", isHome: true };
  return { path, slug: slugify(path), isHome: false };
}

function extOf(url: string, ct?: string | null): string {
  const m = url.split("?")[0].match(/\.([a-z0-9]{1,8})$/i);
  if (m) return m[1].toLowerCase();
  if (ct) {
    if (ct.includes("css")) return "css";
    if (ct.includes("javascript")) return "js";
    if (ct.includes("png")) return "png";
    if (ct.includes("jpeg")) return "jpg";
    if (ct.includes("svg")) return "svg";
    if (ct.includes("webp")) return "webp";
    if (ct.includes("woff2")) return "woff2";
    if (ct.includes("woff")) return "woff";
    if (ct.includes("font/ttf")) return "ttf";
  }
  return "bin";
}

function kindOf(ext: string, ct?: string | null): string {
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "ico"].includes(ext)) return "image";
  if (ext === "css") return "css";
  if (ext === "js") return "js";
  if (["woff", "woff2", "ttf", "otf", "eot"].includes(ext)) return "font";
  if (ct?.startsWith("image/")) return "image";
  if (ct?.startsWith("font/")) return "font";
  return "other";
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function firecrawl<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY não configurado");
  const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface ClonePayload {
  workspace_id: string;
  source_url: string;
  pages: string[];                       // lista de URLs a clonar
  options?: {
    keepScripts?: boolean;
    includeSubdomains?: boolean;
    name?: string;
    design_tokens?: Record<string, unknown>;
  };
}

export async function handleClone(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const correlationId =
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-request-id") ||
    crypto.randomUUID();
  const t0 = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const projectRef = (() => { try { return new URL(SUPABASE_URL).hostname.split(".")[0]; } catch { return "unknown"; } })();
  const log = (event: string, data: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({
      fn: "builder-site-clone",
      correlation_id: correlationId,
      event,
      elapsed_ms: Date.now() - t0,
      ...data,
    }));
  };
  log("request.received", {
    method: req.method,
    project_ref: projectRef,
    supabase_url: SUPABASE_URL,
    has_anon_key: !!SUPABASE_ANON_KEY,
    has_service_role: !!SUPABASE_SERVICE_ROLE_KEY,
    user_agent: req.headers.get("user-agent"),
    origin: req.headers.get("origin"),
  });
  try {
    if (req.method !== "POST") return json({ error: "Método inválido" }, 405);

    const auth = req.headers.get("Authorization");
    if (!auth) {
      log("auth.missing");
      return json({ error: "Não autenticado" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uerr } = await userClient.auth.getUser();
    if (uerr || !u?.user) {
      log("auth.invalid", { error: uerr?.message });
      return json({ error: "Sessão inválida", code: "INVALID_SESSION" }, 401);
    }
    const userId = u.user.id;
    log("auth.ok", { user_id: userId, email: u.user.email });

    const body = (await req.json().catch(() => null)) as ClonePayload | null;
    if (!body?.workspace_id || !body?.source_url || !Array.isArray(body.pages)) {
      log("payload.invalid", { has_body: !!body });
      return json({ error: "Payload inválido", code: "INVALID_PAYLOAD" }, 400);
    }
    log("payload.received", {
      workspace_id: body.workspace_id,
      source_url: body.source_url,
      pages_count: body.pages.length,
      options: body.options,
    });

    // Valida formato UUID do workspace_id
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(body.workspace_id)) {
      log("workspace.uuid_invalid", { workspace_id: body.workspace_id });
      return json({ error: "workspace_id inválido", code: "INVALID_WORKSPACE_ID" }, 400);
    }

    // Cliente service-role para verificações de acesso e escrita atómica
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    log("routing.resolved", {
      workspace_id: body.workspace_id,
      project_ref: projectRef,
      supabase_url: SUPABASE_URL,
    });

    // ===== VALIDAÇÃO DE ACESSO (antes de qualquer operação) =====
    // 1. Verifica se o workspace existe
    const { data: ws, error: wsErr } = await admin
      .from("workspaces")
      .select("id, owner_id, deleted_at")
      .eq("id", body.workspace_id)
      .maybeSingle();
    if (wsErr) {
      log("workspace.lookup_error", { error: wsErr.message });
      return json({ error: "Erro a validar workspace", code: "WORKSPACE_LOOKUP_ERROR" }, 500);
    }
    if (!ws || ws.deleted_at) {
      log("workspace.not_found", { workspace_id: body.workspace_id, deleted: !!ws?.deleted_at });
      return json({ error: "Workspace não encontrado", code: "WORKSPACE_NOT_FOUND" }, 404);
    }
    log("workspace.found", { workspace_id: ws.id, owner_id: ws.owner_id });

    // 2. Verifica se o utilizador é owner, membro (qualquer role) ou super_admin
    const isOwner = ws.owner_id === userId;
    let isMember = false;
    let memberRole: string | null = null;

    if (!isOwner) {
      const { data: membership } = await admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (membership) {
        isMember = true;
        memberRole = String(membership.role ?? "member");
      }
    }

    let isSuper = false;
    if (!isOwner && !isMember) {
      const { data: superFlag } = await admin.rpc("is_super_admin", { _user_id: userId });
      isSuper = !!superFlag;
    }

    if (!isOwner && !isMember && !isSuper) {
      log("access.denied", {
        user_id: userId,
        workspace_id: body.workspace_id,
        owner_id: ws.owner_id,
      });
      return json({ error: "Sem acesso a este workspace", code: "USER_NOT_MEMBER" }, 403);
    }

    log("access.granted", {
      user_id: userId,
      workspace_id: body.workspace_id,
      via: isOwner ? "owner" : isMember ? `member:${memberRole}` : "super_admin",
    });
    // ===== FIM VALIDAÇÃO =====

    const pages = body.pages.slice(0, MAX_PAGES_HARD);
    if (pages.length === 0) return json({ error: "Sem páginas para clonar", code: "NO_PAGES" }, 400);

    let srcUrl: URL;
    try { srcUrl = new URL(body.source_url); } catch { return json({ error: "source_url inválida", code: "INVALID_SOURCE_URL" }, 400); }
    if (isBlockedHost(srcUrl.hostname)) return json({ error: "Host bloqueado", code: "BLOCKED_HOST" }, 400);

    const name = body.options?.name?.trim() || srcUrl.hostname;
    const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 8);

    // 1. Cria asset agregador (type=site)
    const { data: asset, error: aerr } = await admin
      .from("builder_assets")
      .insert({
        workspace_id: body.workspace_id,
        type: "site",
        status: "draft",
        name,
        slug,
        html: "<!-- multi-page site, ver builder_site_pages -->",
        metadata: { source_url: srcUrl.toString(), is_cloned_site: true, correlation_id: correlationId },
        created_by: userId,
      })
      .select()
      .single();
    if (aerr || !asset) {
      log("asset.create_failed", { error: aerr?.message });
      return json({ error: aerr?.message ?? "Falha a criar asset" }, 500);
    }
    log("asset.created", { asset_id: asset.id });

    // 2. Cria builder_sites
    const { data: site, error: serr } = await admin
      .from("builder_sites")
      .insert({
        workspace_id: body.workspace_id,
        asset_id: asset.id,
        source_url: srcUrl.toString(),
        source_host: srcUrl.hostname,
        name,
        status: "cloning",
        pages_total: pages.length,
        options: body.options ?? {},
        design_tokens: body.options?.design_tokens ?? {},
        created_by: userId,
      })
      .select()
      .single();
    if (serr || !site) {
      log("site.create_failed", { error: serr?.message });
      return json({ error: serr?.message ?? "Falha a criar site" }, 500);
    }
    log("site.created", { site_id: site.id, asset_id: asset.id, pages_total: pages.length });

    // 3. Cria registos pendentes para cada página
    const pageRows = pages.map((p, i) => {
      try {
        const u = new URL(p);
        const { path, slug: pslug, isHome } = pathToSlug(u);
        return {
          site_id: site.id,
          workspace_id: body.workspace_id,
          source_url: u.toString(),
          path,
          slug: pslug + (i === 0 ? "" : `-${i}`).replace(/-0$/, ""),
          status: "pending" as const,
          order_index: i,
          is_home: isHome,
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as Array<Record<string, unknown>>;

    // Garante slugs únicos por site
    const seen = new Set<string>();
    pageRows.forEach((r, i) => {
      let s = String(r.slug);
      let n = 1;
      while (seen.has(s)) { s = `${r.slug}-${n++}`; }
      seen.add(s);
      pageRows[i].slug = s;
    });

    const { error: perr } = await admin.from("builder_site_pages").insert(pageRows);
    if (perr) {
      log("site_pages.insert_failed", { error: perr.message, site_id: site.id });
      await admin.from("builder_sites").update({ status: "failed", error: perr.message }).eq("id", site.id);
      return json({ error: perr.message }, 500);
    }
    log("site_pages.inserted", { site_id: site.id, count: pageRows.length });

    // 4. Dispara processamento em background
    const ctx = {
      siteId: site.id,
      workspaceId: body.workspace_id,
      assetId: asset.id,
      keepScripts: !!body.options?.keepScripts,
      sourceHost: srcUrl.hostname,
      sourceOrigin: srcUrl.origin,
    };
    log("background.scheduled", {
      site_id: site.id,
      asset_id: asset.id,
      workspace_id: body.workspace_id,
      pages_total: pages.length,
    });
    // @ts-ignore EdgeRuntime is available in supabase deno runtime
    EdgeRuntime.waitUntil(processSite(admin, ctx));

    log("response.sent", {
      site_id: site.id,
      asset_id: asset.id,
      pages_total: pages.length,
    });
    return json({
      site_id: site.id,
      asset_id: asset.id,
      pages_total: pages.length,
      status: "cloning",
      correlation_id: correlationId,
    });
  } catch (e) {
    log("error.unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
}

Deno.serve(handleClone);

interface ProcessCtx {
  siteId: string;
  workspaceId: string;
  assetId: string;
  keepScripts: boolean;
  sourceHost: string;
  sourceOrigin: string;
}

async function processSite(admin: ReturnType<typeof createClient>, ctx: ProcessCtx): Promise<void> {
  const { data: pages } = await admin
    .from("builder_site_pages")
    .select("id, source_url, path, slug")
    .eq("site_id", ctx.siteId)
    .eq("status", "pending")
    .order("order_index", { ascending: true });

  if (!pages || pages.length === 0) {
    await admin.from("builder_sites").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", ctx.siteId);
    return;
  }

  // Mapa de slugs por URL para reescrita de links internos
  const slugByUrl = new Map<string, string>();
  for (const p of pages) slugByUrl.set(String(p.source_url), String(p.slug));

  const assetCacheBySha = new Map<string, string>(); // sha256 -> public url
  let done = 0; let failed = 0;
  let lastProgressUpdate = 0;

  const updateProgress = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastProgressUpdate < 1500) return;
    lastProgressUpdate = now;
    await admin.from("builder_sites").update({
      pages_done: done,
      pages_failed: failed,
    }).eq("id", ctx.siteId);
  };

  const processPage = async (page: typeof pages[number]) => {
    await admin.from("builder_site_pages").update({ status: "cloning" }).eq("id", page.id);
    try {
      const fetchUrl = String(page.source_url).split("#")[0];
      const sc = await firecrawl<{ success: boolean; data?: { html?: string; metadata?: { title?: string } } }>(
        "/scrape",
        {
          url: fetchUrl,
          formats: ["html"],
          onlyMainContent: false,
          timeout: 25000,
        },
      );
      let html = sc?.data?.html ?? "";
      if (!html) throw new Error("HTML vazio");

      if (!ctx.keepScripts) {
        html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
                   .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
                   .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
      }

      html = await rewriteAssets(html, String(page.source_url), ctx, admin, assetCacheBySha);
      html = rewriteInternalLinks(html, String(page.source_url), ctx, slugByUrl);

      const title = sc?.data?.metadata?.title ?? null;

      await admin.from("builder_site_pages").update({
        status: "ok",
        html,
        title,
        bytes: html.length,
        error: null,
      }).eq("id", page.id);
      done++;
    } catch (e) {
      failed++;
      await admin.from("builder_site_pages").update({
        status: "error",
        error: e instanceof Error ? e.message.slice(0, 500) : "Erro desconhecido",
      }).eq("id", page.id);
    }
    await updateProgress();
  };

  // Paraleliza páginas (4 simultâneas) — cache de assets partilhada acelera ainda mais
  const PAGE_CONCURRENCY = 4;
  for (let i = 0; i < pages.length; i += PAGE_CONCURRENCY) {
    const batch = pages.slice(i, i + PAGE_CONCURRENCY);
    await Promise.all(batch.map(processPage));
  }
  await updateProgress(true);

  const finalStatus = failed === 0 ? "completed" : (done === 0 ? "failed" : "partial");
  await admin.from("builder_sites").update({
    status: finalStatus,
    completed_at: new Date().toISOString(),
  }).eq("id", ctx.siteId);
}

function rewriteInternalLinks(
  html: string,
  pageUrl: string,
  ctx: ProcessCtx,
  slugByUrl: Map<string, string>,
): string {
  const base = new URL(pageUrl);
  return html.replace(/(\shref)=("|')([^"']+)\2/gi, (m, attr, q, raw) => {
    if (raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return m;
    try {
      const abs = new URL(raw, base);
      if (abs.hostname.replace(/^www\./, "") !== ctx.sourceHost.replace(/^www\./, "")) return m;
      const target = abs.toString();
      // tenta match com ou sem trailing slash
      const candidates = [target, target.replace(/\/$/, ""), target + "/"];
      for (const c of candidates) {
        if (slugByUrl.has(c)) {
          const slug = slugByUrl.get(c)!;
          return `${attr}=${q}#/clone/${slug}${q}`;
        }
      }
      return m;
    } catch { return m; }
  });
}

async function rewriteAssets(
  html: string,
  pageUrl: string,
  ctx: ProcessCtx,
  admin: ReturnType<typeof createClient>,
  cache: Map<string, string>,
): Promise<string> {
  const base = new URL(pageUrl);
  const attrRe = /(\s(?:src|href))=("|')([^"']+)\2/gi;

  // Coleta refs únicas
  const refs = new Set<string>();
  let m;
  while ((m = attrRe.exec(html))) {
    const raw = m[3];
    if (!raw) continue;
    if (raw.startsWith("data:") || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    try {
      const abs = new URL(raw, base);
      if (!["http:", "https:"].includes(abs.protocol)) continue;
      // Só rescreve assets binários (não páginas HTML do mesmo host)
      const ext = extOf(abs.pathname);
      if (ext === "html" || ext === "htm" || ext === "bin") {
        // se for outro host e parecer asset, processa; se for html mesmo host, deixa para link rewriter
        if (abs.hostname.replace(/^www\./, "") === ctx.sourceHost.replace(/^www\./, "") && (ext === "html" || ext === "htm")) continue;
      }
      refs.add(abs.toString());
    } catch { /* ignore */ }
  }

  // Faz fetch + upload em paralelo limitado
  const urlMap = new Map<string, string>();
  const arr = Array.from(refs);
  const batchSize = 16;
  for (let i = 0; i < arr.length; i += batchSize) {
    const batch = arr.slice(i, i + batchSize);
    await Promise.all(batch.map(async (assetUrl) => {
      try {
        const publicUrl = await fetchAndStoreAsset(assetUrl, ctx, admin, cache);
        if (publicUrl) urlMap.set(assetUrl, publicUrl);
      } catch { /* ignore individual asset failures */ }
    }));
  }

  // Substitui no HTML
  return html.replace(/(\s(?:src|href))=("|')([^"']+)\2/gi, (full, attr, q, raw) => {
    if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return full;
    try {
      const abs = new URL(raw, base).toString();
      const repl = urlMap.get(abs);
      return repl ? `${attr}=${q}${repl}${q}` : full;
    } catch { return full; }
  });
}

async function fetchAndStoreAsset(
  url: string,
  ctx: ProcessCtx,
  admin: ReturnType<typeof createClient>,
  cache: Map<string, string>,
): Promise<string | null> {
  // verifica se já guardado
  const { data: existing } = await admin
    .from("builder_site_assets")
    .select("storage_path, sha256")
    .eq("site_id", ctx.siteId)
    .eq("original_url", url)
    .maybeSingle();
  if (existing?.storage_path) return publicUrlFor(String(existing.storage_path));

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ASSET_TIMEOUT);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "FastCRM-SiteCloner/1.0" },
    });
  } catch { clearTimeout(t); return null; }
  clearTimeout(t);
  if (!res.ok) return null;

  const ct = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_ASSET_BYTES) return null;

  const sha = await sha256Hex(buf);
  if (cache.has(sha)) {
    const existingUrl = cache.get(sha)!;
    // regista referência adicional
    const ext = extOf(url, ct);
    const storage_path = existingUrl.split(`/${BUCKET}/`)[1] ?? "";
    if (storage_path) {
      await admin.from("builder_site_assets").insert({
        site_id: ctx.siteId,
        workspace_id: ctx.workspaceId,
        original_url: url,
        storage_path,
        content_type: ct,
        bytes: buf.byteLength,
        sha256: sha,
        kind: kindOf(ext, ct),
      }).select().maybeSingle();
    }
    return existingUrl;
  }

  const ext = extOf(url, ct);
  const storage_path = `${ctx.workspaceId}/${ctx.siteId}/${sha.slice(0, 2)}/${sha}.${ext}`;
  const up = await admin.storage.from(BUCKET).upload(storage_path, new Uint8Array(buf), {
    contentType: ct ?? "application/octet-stream",
    upsert: true,
  });
  if (up.error && !String(up.error.message).includes("exists")) return null;

  await admin.from("builder_site_assets").insert({
    site_id: ctx.siteId,
    workspace_id: ctx.workspaceId,
    original_url: url,
    storage_path,
    content_type: ct,
    bytes: buf.byteLength,
    sha256: sha,
    kind: kindOf(ext, ct),
  });

  const pub = publicUrlFor(storage_path);
  cache.set(sha, pub);
  return pub;
}

function publicUrlFor(storagePath: string): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
