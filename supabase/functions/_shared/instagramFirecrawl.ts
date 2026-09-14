/**
 * Camada Firecrawl para o extrator de Instagram.
 *
 * Serve dois propósitos:
 *  1) Descobrir perfis públicos por pesquisa web (site:instagram.com ...).
 *  2) Completar dados em falta de um perfil público (nome, seguidores, contactos
 *     publicados na página) quando a API de Instagram falha ou devolve vazios.
 *
 * Nunca inventa dados: tudo o que devolve vem do conteúdo público recolhido.
 */

import { firecrawl } from "./firecrawl-client.ts";

const RESERVED = new Set([
  "p", "reel", "reels", "explore", "stories", "tv", "accounts", "directory",
  "about", "legal", "developer", "developers", "help", "privacy", "terms",
  "web", "direct", "challenge", "emails", "session", "sitemap.xml",
]);

const USERNAME_RE = /^[A-Za-z0-9._]{1,60}$/;

/** Extrai o @perfil de um URL de Instagram; devolve null se não for um perfil. */
export function extractUsernameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const first = u.pathname.split("/").filter(Boolean)[0];
    if (!first) return null;
    const username = first.toLowerCase();
    if (RESERVED.has(username)) return null;
    if (!USERNAME_RE.test(username)) return null;
    return username;
  } catch {
    return null;
  }
}

/** Converte "12.3K", "1,234", "2M" em número. Devolve null se não reconhecer. */
export function parseCount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
  const m = cleaned.match(/^([\d.]+)([KkMmBb])?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const mult = m[2]?.toLowerCase();
  const factor = mult === "k" ? 1_000 : mult === "m" ? 1_000_000 : mult === "b" ? 1_000_000_000 : 1;
  return Math.round(value * factor);
}

export interface InstagramMeta {
  fullName: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
}

/**
 * Lê a descrição pública das páginas de perfil do Instagram, no formato
 * "12.3K Followers, 456 Following, 78 Posts - Name (@handle) on Instagram: ...".
 */
export function parseInstagramMetaDescription(
  description: string | null | undefined,
  title?: string | null,
): InstagramMeta {
  const desc = description ?? "";
  const grab = (labels: string[]): number | null => {
    for (const label of labels) {
      const re = new RegExp(`([\\d.,]+\\s*[KkMmBb]?)\\s*${label}`, "i");
      const m = desc.match(re);
      if (m) {
        const n = parseCount(m[1]);
        if (n !== null) return n;
      }
    }
    return null;
  };

  let fullName: string | null = null;
  const fromDesc = desc.match(/(?:videos? from|—|-)\s*([^(@|·]{2,80}?)\s*[(@]/i);
  if (fromDesc?.[1]) fullName = fromDesc[1].trim().replace(/[|·-]+$/, "").trim() || null;
  if (!fullName && title) {
    const fromTitle = title.match(/^([^(@|·]{2,80}?)\s*[(@|·]/);
    if (fromTitle?.[1]) fullName = fromTitle[1].trim() || null;
  }

  return {
    fullName,
    followers: grab(["followers", "seguidores"]),
    following: grab(["following", "a seguir", "seguindo"]),
    posts: grab(["posts", "publicações", "publicacoes"]),
  };
}

export interface FirecrawlProfileResult {
  username: string;
  fullName: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  /** Texto público recolhido da página (usado só para contactos publicados). */
  pageText: string | null;
  profilePicUrl: string | null;
}

/** Recolhe o que é público na página de um perfil, via Firecrawl. */
export async function firecrawlProfile(username: string): Promise<FirecrawlProfileResult> {
  const url = `https://www.instagram.com/${username}/`;
  const res = await firecrawl.scrape(url, {
    formats: ["markdown"],
    onlyMainContent: false,
    timeout: 25_000,
  });

  const meta = res.data?.metadata ?? {};
  const parsed = parseInstagramMetaDescription(
    typeof meta.description === "string" ? meta.description : null,
    typeof meta.title === "string" ? meta.title : null,
  );

  return {
    username,
    fullName: parsed.fullName,
    followers: parsed.followers,
    following: parsed.following,
    posts: parsed.posts,
    pageText: [res.data?.markdown, typeof meta.description === "string" ? meta.description : null]
      .filter(Boolean)
      .join("\n") || null,
    profilePicUrl: typeof meta.ogImage === "string" ? meta.ogImage : null,
  };
}

/** Descobre @perfis públicos por pesquisa web. */
export async function firecrawlSearchUsernames(
  query: string,
  limit: number,
): Promise<string[]> {
  const res = await firecrawl.search(`site:instagram.com ${query}`, {
    limit: Math.min(Math.max(limit, 1), 50),
  });
  const out = new Set<string>();
  for (const item of res.data ?? []) {
    const username = extractUsernameFromUrl(item.url);
    if (username) out.add(username);
  }
  return [...out];
}
