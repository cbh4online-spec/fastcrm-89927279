/**
 * Leitura de ficheiros exportados pelo Growman (CSV/XLSX) para perfis de prospeção Instagram.
 * Só aceita usernames Instagram válidos; o URL de perfil é sempre construído a partir do username.
 */

export interface GrowmanProfile {
  username: string;
  profileUrl: string;
  fullName: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  isVerified: boolean | null;
  isBusiness: boolean | null;
  isPrivate: boolean | null;
  category: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
}

export interface GrowmanParseResult {
  profiles: GrowmanProfile[];
  invalidRows: number;
  duplicateRows: number;
  hasUsernameColumn: boolean;
}

const norm = (h: string) =>
  h.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const ALIASES: Record<keyof Omit<GrowmanProfile, "profileUrl"> | "url", string[]> = {
  username: ["username", "user_name", "handle", "instagram_username", "utilizador", "nome_de_utilizador", "usuario", "nome_de_usuario", "login"],
  url: ["profile_url", "url", "link", "profile_link", "instagram_url", "perfil", "profile"],
  fullName: ["full_name", "fullname", "name", "nome", "nome_completo"],
  bio: ["biography", "bio", "description", "descricao", "biografia"],
  email: ["email", "public_email", "business_email", "e_mail", "email_publico"],
  phone: ["phone", "phone_number", "public_phone_number", "contact_phone_number", "business_phone", "whatsapp", "telefone", "telemovel", "public_phone"],
  followers: ["followers", "follower_count", "followers_count", "seguidores"],
  following: ["following", "following_count", "follows", "seguindo", "a_seguir"],
  posts: ["posts", "media_count", "posts_count", "publicacoes"],
  isVerified: ["is_verified", "verified", "verificado"],
  isBusiness: ["is_business", "is_business_account", "business", "conta_comercial"],
  isPrivate: ["is_private", "private", "privado"],
  category: ["category", "business_category", "category_name", "categoria"],
  externalUrl: ["external_url", "website", "site", "external_link"],
  imageUrl: ["profile_pic_url", "profile_picture", "avatar", "profile_pic_url_hd", "image"],
};

const USERNAME_RE = /^(?!.*\.\.)(?!\.)[a-z0-9._]{1,30}(?<!\.)$/;
const RESERVED = new Set(["p", "reel", "reels", "stories", "explore", "direct", "accounts", "tv", "about", "developer", "legal"]);

export function normalizeInstagramUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  const m = v.match(/^https:\/\/(?:www\.|m\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (m) v = m[1];
  else if (/[/:]/.test(v)) return null;
  v = v.replace(/^@/, "").toLowerCase();
  if (!USERNAME_RE.test(v) || RESERVED.has(v)) return null;
  return v;
}

const toNum = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(String(v).replace(/[\s.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
const toBool = (v: string | undefined) => {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "sim", "y", "verdadeiro"].includes(s)) return true;
  if (["false", "0", "no", "nao", "não", "n", "falso"].includes(s)) return false;
  return null;
};
const txt = (v: string | undefined, max = 2000) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
const httpsOnly = (v: string | undefined) => {
  const s = txt(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
};

/** Divide CSV respeitando aspas; deteta «;», «,» ou tab. */
export function parseCsvText(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export function mapGrowmanRows(rows: Record<string, string>[]): GrowmanParseResult {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const col: Partial<Record<keyof typeof ALIASES, string>> = {};
  for (const [field, aliases] of Object.entries(ALIASES) as [keyof typeof ALIASES, string[]][]) {
    const h = aliases.map((a) => headers.find((x) => norm(x) === a)).find(Boolean);
    if (h) col[field] = h;
  }
  const get = (r: Record<string, string>, f: keyof typeof ALIASES) => (col[f] ? r[col[f]!] : undefined);

  const seen = new Set<string>();
  const profiles: GrowmanProfile[] = [];
  let invalidRows = 0;
  let duplicateRows = 0;
  for (const r of rows) {
    const username = normalizeInstagramUsername(get(r, "username")) ?? normalizeInstagramUsername(get(r, "url"));
    if (!username) { invalidRows++; continue; }
    if (seen.has(username)) { duplicateRows++; continue; }
    seen.add(username);
    const email = txt(get(r, "email"), 320);
    const phoneRaw = txt(get(r, "phone"), 40);
    const phoneDigits = phoneRaw?.replace(/[^\d+]/g, "") ?? "";
    profiles.push({
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      fullName: txt(get(r, "fullName"), 200),
      bio: txt(get(r, "bio")),
      email: email && EMAIL_RE.test(email) ? email.toLowerCase() : null,
      phone: phoneDigits.replace(/\D/g, "").length >= 7 ? phoneDigits : null,
      followers: toNum(get(r, "followers")),
      following: toNum(get(r, "following")),
      posts: toNum(get(r, "posts")),
      isVerified: toBool(get(r, "isVerified")),
      isBusiness: toBool(get(r, "isBusiness")),
      isPrivate: toBool(get(r, "isPrivate")),
      category: txt(get(r, "category"), 200),
      externalUrl: httpsOnly(get(r, "externalUrl")),
      imageUrl: httpsOnly(get(r, "imageUrl")),
    });
  }
  return { profiles, invalidRows, duplicateRows, hasUsernameColumn: !!(col.username || col.url) };
}

export const GROWMAN_MAX_ROWS = 5000;
