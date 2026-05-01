// Registry de temas visuais do Lookbook B2B
// Cada tema define paleta + tipografia + acentos.

import type { LookbookThemeKey } from "@/types/partnerCatalog";

export interface LookbookTheme {
  key: LookbookThemeKey;
  name: string;
  description: string;
  // CSS vars aplicadas via inline style no container raiz da página
  cssVars: Record<string, string>;
  // Classes utilitárias
  bodyFont: string;
  displayFont: string;
}

export const LOOKBOOK_THEMES: Record<LookbookThemeKey, LookbookTheme> = {
  "nude-cosmetic": {
    key: "nude-cosmetic",
    name: "Nude Cosmetic",
    description: "Beige rosado · serif elegante · estilo lookbook editorial",
    bodyFont: "font-sans",
    displayFont: "font-editorial",
    cssVars: {
      "--lb-bg": "30 38% 92%",        // beige rosé claro
      "--lb-surface": "30 30% 96%",
      "--lb-ink": "20 20% 18%",       // chocolate escuro
      "--lb-muted": "25 15% 45%",
      "--lb-accent": "20 30% 25%",    // brown deep
      "--lb-cta": "20 25% 22%",
      "--lb-cta-fg": "30 38% 96%",
      "--lb-divider": "20 20% 18%",
    },
  },
  "editorial-ink": {
    key: "editorial-ink",
    name: "Editorial Ink",
    description: "Cream + ink — matching Dashboard premium",
    bodyFont: "font-sans",
    displayFont: "font-editorial",
    cssVars: {
      "--lb-bg": "40 30% 95%",
      "--lb-surface": "0 0% 100%",
      "--lb-ink": "220 20% 15%",
      "--lb-muted": "220 10% 40%",
      "--lb-accent": "30 40% 35%",
      "--lb-cta": "220 20% 15%",
      "--lb-cta-fg": "40 30% 95%",
      "--lb-divider": "220 15% 80%",
    },
  },
  "clinical-minimal": {
    key: "clinical-minimal",
    name: "Clinical Minimal",
    description: "Branco + cinza azulado · linha clínica profissional",
    bodyFont: "font-sans",
    displayFont: "font-sans",
    cssVars: {
      "--lb-bg": "210 25% 98%",
      "--lb-surface": "0 0% 100%",
      "--lb-ink": "215 30% 18%",
      "--lb-muted": "215 15% 45%",
      "--lb-accent": "200 60% 40%",
      "--lb-cta": "215 30% 22%",
      "--lb-cta-fg": "0 0% 100%",
      "--lb-divider": "215 20% 88%",
    },
  },
};

export function getLookbookTheme(key: LookbookThemeKey | string | null | undefined): LookbookTheme {
  if (key && key in LOOKBOOK_THEMES) {
    return LOOKBOOK_THEMES[key as LookbookThemeKey];
  }
  return LOOKBOOK_THEMES["nude-cosmetic"];
}

export function lookbookThemeStyle(theme: LookbookTheme): React.CSSProperties {
  return theme.cssVars as React.CSSProperties;
}
