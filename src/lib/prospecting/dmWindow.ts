/**
 * Abertura de DM em dois passos explícitos, sem janelas about:blank:
 * 1) «Preparar» (clique) verifica identidade/media e mostra o texto exato; a cópia
 *    é tentada com o foco ainda no FastCRM e, se falhar, o utilizador copia com novo clique.
 * 2) «Abrir conversa» é um link real (<a href target=_blank>) clicado pelo utilizador,
 *    com href https validado. Só esse clique ativa «Já enviei».
 */
const ALLOWED_DM_HOSTS = new Set(["ig.me", "instagram.com", "www.instagram.com", "m.instagram.com"]);
export const DM_INVALID_URL_MESSAGE = "Ligação de conversa inválida: só são aceites ligações https do Instagram.";
export const DM_COPY_FAILED_MESSAGE = "Não foi possível copiar automaticamente. Selecione o texto ou use «Copiar».";

/** Aceita apenas https:// para hosts Instagram/ig.me, sem credenciais nem porta. */
export function safeDmUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 2048 || !/^https:\/\//i.test(value)) return null;
  let u: URL;
  try { u = new URL(value); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  if (!ALLOWED_DM_HOSTS.has(u.hostname.toLowerCase())) return null;
  return u.toString();
}

const PROFILE_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
/** Segmentos de conteúdo/sistema do Instagram que nunca são um @perfil. */
const RESERVED_SEGMENTS = new Set([
  "p", "reel", "reels", "tv", "stories", "story", "explore", "direct", "accounts", "account",
  "about", "legal", "developer", "developers", "help", "privacy", "terms", "web", "challenge",
  "emails", "session", "sitemap.xml", "directory", "s", "share", "ar", "lite", "topics",
  "locations", "tags", "graphql", "api", "oauth", "login", "logout", "signup", "press",
  "creators", "blog", "download", "nametag", "invites", "your_activity", "m",
]);
const USERNAME_RE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;

/**
 * Extrai o @perfil apenas de um URL de perfil raiz: https, host exato do Instagram,
 * sem credenciais/porta, caminho «/username» ou «/username/». Tudo o resto → null.
 */
export function parseInstagramProfileUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 2048 || !/^https:\/\//i.test(value)) return null;
  let u: URL;
  try { u = new URL(value); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  if (!PROFILE_HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/([^/]+)\/?$/);
  if (!m) return null;
  const segment = m[1];
  if (!USERNAME_RE.test(segment) || RESERVED_SEGMENTS.has(segment.toLowerCase())) return null;
  return segment.toLowerCase();
}

/** Ligação de DM (ig.me) só a partir de um URL de perfil válido; falha fechada. */
export function buildDmUrl(profileUrl: string | null | undefined): string | null {
  const username = parseInstagramProfileUsername(profileUrl);
  return username ? safeDmUrl(`https://ig.me/m/${username}`) : null;
}

/** Tenta copiar; devolve false (sem lançar) se o browser recusar. */
export async function tryCopyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface PreparedDm {
  text: string;
  mediaUrl: string | null;
  dmUrl: string | null;
  copied: boolean;
}
