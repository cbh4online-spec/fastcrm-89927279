import type { MegaGroup } from "@/config/routeManifest";

/**
 * Per-department (mega-group) accent color tokens.
 * HSL strings without the `hsl()` wrapper, ready for `style={{ color: `hsl(${COLOR.crm.fg})` }}`.
 *
 * Scoped to the sidebar — não polui o tema global.
 */
export const MEGA_GROUP_COLORS: Record<MegaGroup, { fg: string; bg: string; border: string }> = {
  inicio:              { fg: "210 90% 45%", bg: "210 90% 45% / 0.10", border: "210 90% 45% / 0.30" }, // azul
  comercial:           { fg: "260 70% 50%", bg: "260 70% 50% / 0.10", border: "260 70% 50% / 0.30" }, // roxo
  marketing:           { fg: "330 75% 45%", bg: "330 75% 45% / 0.10", border: "330 75% 45% / 0.30" }, // rosa
  comunicacao:         { fg: "190 85% 38%", bg: "190 85% 38% / 0.10", border: "190 85% 38% / 0.30" }, // ciano
  "vendas-financeiro": { fg: "20 85% 48%",  bg: "20 85% 48% / 0.10",  border: "20 85% 48% / 0.30" },  // laranja
  "compras-logistica": { fg: "35 90% 42%",  bg: "35 90% 42% / 0.10",  border: "35 90% 42% / 0.30" },  // âmbar
  "loja-marketplace":  { fg: "150 70% 35%", bg: "150 70% 35% / 0.10", border: "150 70% 35% / 0.30" }, // verde
  suporte:             { fg: "175 80% 32%", bg: "175 80% 32% / 0.10", border: "175 80% 32% / 0.30" }, // turquesa
  rh:                  { fg: "280 65% 50%", bg: "280 65% 50% / 0.10", border: "280 65% 50% / 0.30" }, // violeta
  seguranca:           { fg: "0 75% 48%",   bg: "0 75% 48% / 0.10",   border: "0 75% 48% / 0.30" },   // vermelho
  inteligencia:        { fg: "240 75% 55%", bg: "240 75% 55% / 0.10", border: "240 75% 55% / 0.30" }, // índigo
  administracao:       { fg: "220 15% 40%", bg: "220 15% 40% / 0.10", border: "220 15% 40% / 0.30" }, // cinza

};

export function megaGroupColor(key: MegaGroup) {
  return MEGA_GROUP_COLORS[key] || MEGA_GROUP_COLORS.inicio;
}
