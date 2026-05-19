import type { MegaGroup } from "@/config/routeManifest";

/**
 * Per-department (mega-group) accent color tokens.
 * HSL strings without the `hsl()` wrapper, ready for `style={{ color: `hsl(${COLOR.crm.fg})` }}`.
 *
 * Scoped to the sidebar — não polui o tema global.
 */
export const MEGA_GROUP_COLORS: Record<MegaGroup, { fg: string; bg: string; border: string }> = {
  inicio:              { fg: "210 95% 60%", bg: "210 95% 60% / 0.12", border: "210 95% 60% / 0.35" }, // azul
  comercial:           { fg: "260 85% 65%", bg: "260 85% 65% / 0.12", border: "260 85% 65% / 0.35" }, // roxo
  marketing:           { fg: "330 80% 60%", bg: "330 80% 60% / 0.12", border: "330 80% 60% / 0.35" }, // rosa
  comunicacao:         { fg: "190 80% 50%", bg: "190 80% 50% / 0.12", border: "190 80% 50% / 0.35" }, // ciano
  "vendas-financeiro": { fg: "20 90% 60%",  bg: "20 90% 60% / 0.13",  border: "20 90% 60% / 0.35" },  // laranja
  "compras-logistica": { fg: "35 90% 55%",  bg: "35 90% 55% / 0.13",  border: "35 90% 55% / 0.35" },  // âmbar
  "loja-marketplace":  { fg: "150 70% 45%", bg: "150 70% 45% / 0.13", border: "150 70% 45% / 0.35" }, // verde
  suporte:             { fg: "175 75% 45%", bg: "175 75% 45% / 0.13", border: "175 75% 45% / 0.35" }, // turquesa
  rh:                  { fg: "280 70% 60%", bg: "280 70% 60% / 0.12", border: "280 70% 60% / 0.35" }, // violeta
  seguranca:           { fg: "0 75% 55%",   bg: "0 75% 55% / 0.13",   border: "0 75% 55% / 0.35" },   // vermelho
  inteligencia:        { fg: "240 85% 65%", bg: "240 85% 65% / 0.12", border: "240 85% 65% / 0.35" }, // índigo
  administracao:       { fg: "220 15% 55%", bg: "220 15% 55% / 0.13", border: "220 15% 55% / 0.35" }, // cinza
};

export function megaGroupColor(key: MegaGroup) {
  return MEGA_GROUP_COLORS[key] || MEGA_GROUP_COLORS.inicio;
}
