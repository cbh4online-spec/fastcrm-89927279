import type { MegaGroup } from "@/config/routeManifest";

/**
 * Per-mega-group accent color tokens.
 * HSL strings without the `hsl()` wrapper, ready for `style={{ color: `hsl(${COLOR.crm})` }}`.
 *
 * Kept outside index.css so they are scoped to the sidebar and don't pollute the
 * global theme.
 */
export const MEGA_GROUP_COLORS: Record<MegaGroup, { fg: string; bg: string; border: string }> = {
  core:              { fg: "210 95% 60%", bg: "210 95% 60% / 0.12", border: "210 95% 60% / 0.35" }, // azul
  crm:               { fg: "260 85% 65%", bg: "260 85% 65% / 0.12", border: "260 85% 65% / 0.35" }, // roxo
  "sales-marketing": { fg: "20 90% 60%",  bg: "20 90% 60% / 0.13",  border: "20 90% 60% / 0.35" },  // laranja
  enterprise:        { fg: "190 80% 50%", bg: "190 80% 50% / 0.13", border: "190 80% 50% / 0.35" }, // ciano
};

export function megaGroupColor(key: MegaGroup) {
  return MEGA_GROUP_COLORS[key] || MEGA_GROUP_COLORS.core;
}
