export type PublicNavigationVisibility = "primary" | "cta" | "footer" | "hidden";

export type PublicNavigationCategory =
  | "commercial"
  | "campaign"
  | "portal"
  | "seo_content"
  | "technical";

export interface PublicNavigationItem {
  label: string;
  href: string;
  visibility: PublicNavigationVisibility;
  category: PublicNavigationCategory;
  purpose: string;
  seo: "index" | "noindex";
  status: "active" | "planned" | "legacy" | "deprecated";
}

/**
 * Official public menu for FastCRM.
 *
 * Rule:
 * The primary public navigation must stay focused on commercial conversion.
 * Portals, checkout, marketplace, store, technical routes and token-based routes
 * must not appear in this menu.
 */
export const PUBLIC_PRIMARY_NAVIGATION: PublicNavigationItem[] = [
  {
    label: "Início",
    href: "/",
    visibility: "primary",
    category: "commercial",
    purpose: "Apresentar o posicionamento principal do FastCRM",
    seo: "index",
    status: "active",
  },
  {
    label: "WhatsApp Sales",
    href: "/fastcrm-whatsapp-sales",
    visibility: "primary",
    category: "commercial",
    purpose: "Vender a oferta principal FastCRM WhatsApp Sales",
    seo: "index",
    status: "active",
  },
  {
    label: "Funcionalidades",
    href: "/funcionalidades",
    visibility: "primary",
    category: "commercial",
    purpose: "Explicar as funcionalidades principais do FastCRM",
    seo: "index",
    status: "active",
  },
  {
    label: "Preços",
    href: "/precos",
    visibility: "primary",
    category: "commercial",
    purpose: "Apresentar planos, condições comerciais e opções de entrada",
    seo: "index",
    status: "active",
  },
  {
    label: "Casos de Uso",
    href: "/casos",
    visibility: "primary",
    category: "commercial",
    purpose: "Mostrar aplicações práticas por setor e contexto comercial",
    seo: "index",
    status: "active",
  },
  {
    label: "Sobre",
    href: "/sobre",
    visibility: "primary",
    category: "commercial",
    purpose: "Criar confiança, autoridade e contexto da empresa",
    seo: "index",
    status: "active",
  },
  {
    label: "Contacto",
    href: "/contacto",
    visibility: "primary",
    category: "commercial",
    purpose: "Permitir contacto direto com a equipa FastCRM",
    seo: "index",
    status: "active",
  },
];

export const PUBLIC_CTA_NAVIGATION: PublicNavigationItem[] = [
  {
    label: "Agendar Demo",
    href: "/contacto?tipo=demo",
    visibility: "cta",
    category: "commercial",
    purpose: "Converter visitantes em pedidos de demonstração",
    seo: "index",
    status: "active",
  },
];

export const PUBLIC_FOOTER_NAVIGATION: PublicNavigationItem[] = [
  ...PUBLIC_PRIMARY_NAVIGATION,
  {
    label: "Privacidade",
    href: "/privacy",
    visibility: "footer",
    category: "seo_content",
    purpose: "Página legal de privacidade",
    seo: "index",
    status: "active",
  },
  {
    label: "Termos",
    href: "/terms",
    visibility: "footer",
    category: "seo_content",
    purpose: "Página legal de termos de utilização",
    seo: "index",
    status: "active",
  },
  {
    label: "Cookies",
    href: "/cookies",
    visibility: "footer",
    category: "seo_content",
    purpose: "Página legal de política de cookies",
    seo: "index",
    status: "active",
  },
];

/**
 * Routes that must never appear in the public marketing navigation.
 */
export const PUBLIC_NAVIGATION_EXCLUSIONS = [
  "/store/*",
  "/marketplace/*",
  "/c2c/*",
  "/checkout/*",
  "/client/*",
  "/partner/*",
  "/supplier-portal/*",
  "/ticket/*",
  "/portal/proposal/*",
  "/portal/onboarding/*",
  "/pay/invoice/*",
  "/builder/*",
  "/dashboard/*",
  "/messages",
  "/lp/*",
  "/funnel/*",
  "/bio/*",
  "/b/*",
  "/e/*",
];
