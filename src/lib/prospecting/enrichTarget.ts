import { parseInstagramProfileUsername } from "./dmWindow";

/** Username para enriquecimento só de um URL de perfil Instagram válido; falha fechada. */
export function instagramEnrichmentUsername(platform: string | null | undefined, profileUrl: unknown): string | null {
  if (platform !== "instagram") return null;
  return parseInstagramProfileUsername(profileUrl);
}
