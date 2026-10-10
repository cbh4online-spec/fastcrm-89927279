/**
 * Conteúdo partilhado numa abordagem de prospeção (link de perfil/Reel/vídeo
 * ou MP4 carregado). É CONTEÚDO da mensagem, nunca identidade do prospecto:
 * não entra nas verificações de duplicados.
 */

export const PROSPECTING_VIDEO_BUCKET = "prospecting-videos";
export const PROSPECTING_VIDEO_MAX_BYTES = 16 * 1024 * 1024; // 16 MiB
export const PROSPECTING_VIDEO_MIME = "video/mp4";
export const SHARE_URL_MAX_LENGTH = 2048;
/** Validade do link assinado do MP4 (o bucket é privado). */
export const PROSPECTING_VIDEO_LINK_TTL_SECONDS = 60 * 60 * 24 * 90;

export interface OutreachMedia {
  id: string;
  workspace_id: string;
  profile_id: string;
  step_index: number;
  kind: "url" | "video";
  url: string;
  label: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  url_expires_at: string | null;
  created_by: string;
}

export type ShareUrlResult = { ok: boolean; url?: string; error?: string };

/** Só https; rejeita javascript:, data:, file:, http:, credenciais e espaços. Sem fetch. */
export function validateShareUrl(raw: string | null | undefined): ShareUrlResult {
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, error: "Indique uma ligação." };
  if (value.length > SHARE_URL_MAX_LENGTH) return { ok: false, error: "A ligação é demasiado longa." };
  if (/\s/.test(value)) return { ok: false, error: "A ligação não pode ter espaços." };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "Ligação inválida. Use um endereço completo começado por https://" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Só são aceites ligações https://" };
  if (parsed.username || parsed.password) return { ok: false, error: "A ligação não pode conter credenciais." };
  if (!parsed.hostname || !parsed.hostname.includes(".")) return { ok: false, error: "Ligação sem domínio válido." };
  return { ok: true, url: parsed.href };
}

/** Pré-visualização apenas textual (domínio + caminho), sem pedidos externos. */
export function describeShareUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    if (/(^|\.)instagram\.com$/.test(host)) {
      const [first, second] = path.split("/").filter(Boolean);
      if (first === "reel" || first === "reels") return `Reel do Instagram${second ? ` (${second})` : ""}`;
      if (first === "p") return "Publicação do Instagram";
      if (first === "stories") return "Story do Instagram";
      if (first) return `Perfil Instagram @${first}`;
    }
    return `${host}${path.length > 40 ? `${path.slice(0, 40)}…` : path}`;
  } catch {
    return url;
  }
}

/** A mensagem final contém a ligação exatamente uma vez. */
export function composeMessageWithLink(message: string, url: string | null | undefined): string {
  const text = (message ?? "").trim();
  if (!url) return text;
  const parts = text.split(url);
  if (parts.length > 1) {
    // Mantém a primeira ocorrência e remove repetições.
    const [head, ...rest] = parts;
    return `${head}${url}${rest.join("")}`.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  return text ? `${text}\n\n${url}` : url;
}

export type VideoFileResult = { ok: boolean; error?: string };

export function validateVideoFile(file: { name: string; type: string; size: number }): VideoFileResult {
  if (file.type !== PROSPECTING_VIDEO_MIME || !/\.mp4$/i.test(file.name)) {
    return { ok: false, error: "Só são aceites ficheiros MP4." };
  }
  if (file.size <= 0) return { ok: false, error: "O ficheiro está vazio." };
  if (file.size > PROSPECTING_VIDEO_MAX_BYTES) return { ok: false, error: "O vídeo excede 16 MB." };
  return { ok: true };
}

export const SECURE_RANDOM_UNAVAILABLE_MESSAGE =
  "Este navegador não disponibiliza geração aleatória segura. Atualize o navegador para carregar vídeos.";

/** Só crypto forte; sem Math.random. Falha com mensagem clara se indisponível. */
export function randomId(cryptoImpl: Crypto | undefined = globalThis.crypto): string {
  if (cryptoImpl && typeof cryptoImpl.randomUUID === "function") return cryptoImpl.randomUUID();
  if (cryptoImpl && typeof cryptoImpl.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoImpl.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error(SECURE_RANDOM_UNAVAILABLE_MESSAGE);
}

/** Caminho no bucket: workspaceId/userId/<aleatório>.mp4 (nunca o nome original). */
export function buildVideoPath(workspaceId: string, userId: string): string {
  return `${workspaceId}/${userId}/${randomId()}.mp4`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function mediaKey(profileId: string, stepIndex: number): string {
  return `${profileId}:${stepIndex}`;
}

/** Renova se faltar menos de 24 h (ou se já expirou / sem data). */
export const VIDEO_LINK_RENEW_MARGIN_MS = 24 * 60 * 60 * 1000;
export const VIDEO_LINK_EXPIRED_MESSAGE =
  "A ligação do vídeo expirou e não foi possível renová-la. Substitua o vídeo antes de preparar a abordagem.";

export function needsVideoLinkRenewal(media: Pick<OutreachMedia, "kind" | "url_expires_at">, now = Date.now()): boolean {
  if (media.kind !== "video") return false;
  const exp = media.url_expires_at ? Date.parse(media.url_expires_at) : NaN;
  return !Number.isFinite(exp) || exp - now < VIDEO_LINK_RENEW_MARGIN_MS;
}

export function isVideoLinkExpired(media: Pick<OutreachMedia, "kind" | "url_expires_at">, now = Date.now()): boolean {
  if (media.kind !== "video") return false;
  const exp = media.url_expires_at ? Date.parse(media.url_expires_at) : NaN;
  return !Number.isFinite(exp) || exp <= now;
}

/** O URL só é registado como enviado se estiver realmente no texto final. */
export function sentMediaUrlFor(text: string, url: string | null | undefined): string | null {
  return url && text.includes(url) ? url : null;
}
