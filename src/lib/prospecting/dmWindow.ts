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

/** Ligação de DM a partir do perfil (ig.me se houver username), já validada. */
export function buildDmUrl(username: string | null | undefined, profileUrl: string | null | undefined): string | null {
  const clean = username && /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : null;
  return safeDmUrl(clean ? `https://ig.me/m/${clean}` : profileUrl);
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
