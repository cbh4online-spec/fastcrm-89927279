/**
 * Cliente tolerante da API pública de Instagram (RapidAPI instagram-looter2)
 * usado pelo extrator de prospeção.
 */

export const RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com";
const BASE = `https://${RAPIDAPI_HOST}`;

export class InstagramApiError extends Error {
  constructor(message: string, readonly status: number, readonly fatal: boolean) {
    super(message);
  }
}

export async function looterGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<unknown> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": RAPIDAPI_HOST },
  });

  if (res.ok) return await res.json();

  const body = await res.text().catch(() => "");
  // 401/402/403 => problema de chave/subscrição: parar o trabalho.
  const fatal = [401, 402, 403].includes(res.status);
  throw new InstagramApiError(
    `Instagram API ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    res.status,
    fatal,
  );
}

/** Percorre a resposta e recolhe todos os usernames encontrados. */
export function collectUsernames(payload: unknown, limit = 500): string[] {
  const out = new Set<string>();
  const stack: unknown[] = [payload];
  while (stack.length && out.size < limit) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const v of node) stack.push(v);
      continue;
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      const uname = rec.username ?? rec.user_name;
      if (typeof uname === "string" && /^[A-Za-z0-9._]{1,60}$/.test(uname)) out.add(uname);
      for (const v of Object.values(rec)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return [...out];
}

/** Encontra o cursor de paginação em qualquer nível da resposta. */
export function findCursor(payload: unknown): { cursor: string | null; hasNext: boolean } {
  let cursor: string | null = null;
  let hasNext = false;
  const stack: unknown[] = [payload];
  while (stack.length) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const v of node) if (v && typeof v === "object") stack.push(v);
      continue;
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      const c = rec.end_cursor ?? rec.next_cursor ?? rec.max_id;
      if (typeof c === "string" && c.length > 0 && !cursor) cursor = c;
      if (typeof rec.has_next_page === "boolean" && rec.has_next_page) hasNext = true;
      if (typeof rec.more_available === "boolean" && rec.more_available) hasNext = true;
      for (const v of Object.values(rec)) if (v && typeof v === "object") stack.push(v);
    }
  }
  return { cursor, hasNext: hasNext || !!cursor };
}

export interface LooterProfile {
  username: string;
  userId: string | null;
  fullName: string | null;
  biography: string | null;
  externalUrl: string | null;
  profilePicUrl: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  category: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isPrivate: boolean;
  city: string | null;
  raw: unknown;
}

const num = (v: unknown): number | null =>
  typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null;

export function parseProfile(payload: unknown, fallbackUsername: string): LooterProfile {
  const root = (payload ?? {}) as Record<string, unknown>;
  const d = ((root.data ?? root.user ?? root) as Record<string, unknown>) ?? {};
  const user = ((d.user ?? d) as Record<string, unknown>) ?? {};

  const followedBy = user.edge_followed_by as Record<string, unknown> | undefined;
  const follow = user.edge_follow as Record<string, unknown> | undefined;
  const timeline = user.edge_owner_to_timeline_media as Record<string, unknown> | undefined;

  return {
    username: (typeof user.username === "string" ? user.username : fallbackUsername),
    userId: typeof user.id === "string" ? user.id : num(user.pk) !== null ? String(num(user.pk)) : null,
    fullName: (user.full_name as string) ?? null,
    biography: (user.biography as string) ?? (user.bio as string) ?? null,
    externalUrl: (user.external_url as string) ?? null,
    profilePicUrl:
      (user.profile_pic_url_hd as string) ?? (user.profile_pic_url as string) ?? null,
    followers: num(user.follower_count) ?? num(followedBy?.count),
    following: num(user.following_count) ?? num(follow?.count),
    posts: num(user.media_count) ?? num(timeline?.count),
    category: (user.category_name as string) ?? (user.category as string) ?? null,
    isVerified: user.is_verified === true,
    isBusiness: user.is_business_account === true || user.is_business === true,
    isPrivate: user.is_private === true,
    city: (user.city_name as string) ?? null,
    raw: payload,
  };
}
