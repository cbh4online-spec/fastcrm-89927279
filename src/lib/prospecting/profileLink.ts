import { parseInstagramProfileUsername } from "./dmWindow";

export const INVALID_PROFILE_LINK_MESSAGE = "Endereço de perfil inválido: só são abertas páginas de perfil seguras (https).";

/** Destino seguro para «Abrir perfil». Instagram usa o parser estrito; outras redes exigem https sem credenciais/porta. */
export function safeProfileLink(platform: string | null | undefined, raw: unknown): string | null {
  if ((platform ?? "instagram") === "instagram") {
    const username = parseInstagramProfileUsername(raw);
    return username ? `https://www.instagram.com/${username}/` : null;
  }
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^https:\/\//i.test(value) || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    return u.toString();
  } catch { return null; }
}
