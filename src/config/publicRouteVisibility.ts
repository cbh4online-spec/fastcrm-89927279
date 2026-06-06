export type RouteVisibility =
  | "public_nav"
  | "public_hidden"
  | "seo_indexable"
  | "noindex"
  | "auth_required"
  | "token_only"
  | "legacy_redirect"
  | "deprecated";

export type RouteFamily =
  | "marketing"
  | "campaign"
  | "seo_content"
  | "store"
  | "marketplace"
  | "checkout"
  | "community"
  | "portal"
  | "partner"
  | "client"
  | "supplier"
  | "ticket"
  | "booking"
  | "ebook"
  | "bio"
  | "careers"
  | "technical"
  | "dashboard"
  | "legacy";

export type RouteOwner = "marketing" | "sales" | "product" | "support" | "growth" | "legal" | "engineering";

export interface PublicRouteVisibilityRule {
  pattern: string;
  family: RouteFamily;
  visibility: RouteVisibility;
  owner: RouteOwner;
  menu: "primary" | "footer" | "secondary" | "none";
  seo: "index" | "noindex" | "conditional";
  auth: "none" | "optional" | "required" | "token";
  status: "active" | "planned" | "legacy" | "review" | "deprecated";
  purpose: string;
  notes?: string;
}

/**
 * FastCRM public route visibility matrix.
 *
 * This file is the operational source of truth for public, hidden, SEO,
 * authenticated, token-based, legacy and technical routes.
 *
 * Principle:
 * FastCRM may be complex internally, but the public surface must stay simple.
 */
export const PUBLIC_ROUTE_VISIBILITY_MATRIX: PublicRouteVisibilityRule[] = [
  // Commercial public navigation
  {
    pattern: "/",
    family: "marketing",
    visibility: "public_nav",
    owner: "marketing",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Main FastCRM public positioning page",
  },
  {
    pattern: "/fastcrm-whatsapp-sales",
    family: "marketing",
    visibility: "public_nav",
    owner: "sales",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Primary commercial offer for WhatsApp, leads, meetings and follow-up",
  },
  {
    pattern: "/funcionalidades",
    family: "marketing",
    visibility: "public_nav",
    owner: "marketing",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Explain main FastCRM capabilities",
  },
  {
    pattern: "/precos",
    family: "marketing",
    visibility: "public_nav",
    owner: "sales",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Present plans, pricing and commercial entry options",
  },
  {
    pattern: "/casos",
    family: "marketing",
    visibility: "public_nav",
    owner: "marketing",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Show use cases by sector and business context",
  },
  {
    pattern: "/sobre",
    family: "marketing",
    visibility: "public_nav",
    owner: "marketing",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Build trust, authority and company context",
  },
  {
    pattern: "/contacto",
    family: "marketing",
    visibility: "public_nav",
    owner: "sales",
    menu: "primary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Commercial contact and demo requests",
  },

  // Campaign and builder public pages
  {
    pattern: "/lp/:workspaceSlug/:pageSlug",
    family: "campaign",
    visibility: "legacy_redirect",
    owner: "marketing",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "legacy",
    purpose: "Legacy landing-page alias redirected to canonical /p/ route",
  },
  {
    pattern: "/p/:slug",
    family: "campaign",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "conditional",
    auth: "none",
    status: "active",
    purpose: "Published builder assets and landing pages accessible by direct link",
  },
  {
    pattern: "/funnel/:slug",
    family: "campaign",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "conditional",
    auth: "optional",
    status: "active",
    purpose: "Public funnel pages for campaigns and lead capture",
  },

  // SEO and content
  {
    pattern: "/blog",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "SEO content hub",
  },
  {
    pattern: "/blog/:slug",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "none",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "SEO blog article",
  },
  {
    pattern: "/guides/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Educational guides and organic acquisition",
  },
  {
    pattern: "/templates/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Template library for SEO and lead generation",
  },
  {
    pattern: "/tools/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Public tools for organic acquisition and utility",
  },
  {
    pattern: "/glossary/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Glossary pages for SEO authority",
  },
  {
    pattern: "/keywords/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Keyword pages and keyword tools",
  },
  {
    pattern: "/categories/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "SEO category pages",
  },
  {
    pattern: "/compare/*",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "growth",
    menu: "secondary",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Comparison pages for commercial SEO",
  },
  {
    pattern: "/privacy",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "legal",
    menu: "footer",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Privacy policy",
  },
  {
    pattern: "/terms",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "legal",
    menu: "footer",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Terms of use",
  },
  {
    pattern: "/gdpr",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "legal",
    menu: "footer",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "GDPR information",
  },
  {
    pattern: "/cookies",
    family: "seo_content",
    visibility: "seo_indexable",
    owner: "legal",
    menu: "footer",
    seo: "index",
    auth: "none",
    status: "active",
    purpose: "Cookie policy",
  },

  // Store, marketplace and checkout
  {
    pattern: "/store/*",
    family: "store",
    visibility: "public_hidden",
    owner: "product",
    menu: "none",
    seo: "conditional",
    auth: "optional",
    status: "review",
    purpose: "Public store, product, checkout and post-purchase routes",
    notes: "Should not compete with FastCRM commercial positioning unless activated as a specific vertical offer.",
  },
  {
    pattern: "/marketplace/*",
    family: "marketplace",
    visibility: "public_hidden",
    owner: "product",
    menu: "none",
    seo: "conditional",
    auth: "optional",
    status: "review",
    purpose: "Marketplace public listings, live commerce and seller routes",
  },
  {
    pattern: "/c2c/*",
    family: "legacy",
    visibility: "legacy_redirect",
    owner: "engineering",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "legacy",
    purpose: "Legacy C2C route redirects to marketplace",
  },
  {
    pattern: "/checkout/*",
    family: "checkout",
    visibility: "noindex",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "Transactional checkout, upsell, downsell, thank-you and recovery flows",
  },
  {
    pattern: "/pay/invoice/:token",
    family: "checkout",
    visibility: "token_only",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "token",
    status: "active",
    purpose: "Token-based public invoice payment page",
  },

  // Portals and authenticated areas
  {
    pattern: "/client/*",
    family: "client",
    visibility: "auth_required",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "required",
    status: "active",
    purpose: "Client portal and authenticated client features",
  },
  {
    pattern: "/partner/*",
    family: "partner",
    visibility: "auth_required",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "required",
    status: "active",
    purpose: "Partner portal and authenticated partner features",
  },
  {
    pattern: "/supplier-portal/:token",
    family: "supplier",
    visibility: "token_only",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "token",
    status: "active",
    purpose: "Supplier portal accessed by secure token",
  },
  {
    pattern: "/ticket/:token",
    family: "ticket",
    visibility: "token_only",
    owner: "support",
    menu: "none",
    seo: "noindex",
    auth: "token",
    status: "active",
    purpose: "Public ticket portal accessed by token",
  },
  {
    pattern: "/portal/proposal/:token",
    family: "portal",
    visibility: "token_only",
    owner: "sales",
    menu: "none",
    seo: "noindex",
    auth: "token",
    status: "active",
    purpose: "Proposal portal accessed by token",
  },
  {
    pattern: "/portal/onboarding/:token",
    family: "portal",
    visibility: "token_only",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "token",
    status: "active",
    purpose: "Onboarding portal accessed by token",
  },

  // Community and FastClub
  {
    pattern: "/club/:slug/*",
    family: "community",
    visibility: "public_hidden",
    owner: "product",
    menu: "none",
    seo: "conditional",
    auth: "optional",
    status: "review",
    purpose: "Community public and authenticated pages",
    notes: "FastClub/Community must not compete with FastCRM main commercial navigation.",
  },
  {
    pattern: "/fastclub",
    family: "community",
    visibility: "public_hidden",
    owner: "product",
    menu: "none",
    seo: "conditional",
    auth: "none",
    status: "review",
    purpose: "FastClub public landing page",
  },

  // Booking, ebooks, bios and careers
  {
    pattern: "/book/:slug",
    family: "booking",
    visibility: "public_hidden",
    owner: "sales",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "Public booking page by slug",
  },
  {
    pattern: "/:workspaceSlug/book/:slug",
    family: "booking",
    visibility: "public_hidden",
    owner: "sales",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "Workspace-scoped public booking page",
  },
  {
    pattern: "/ebook/:slug",
    family: "ebook",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "conditional",
    auth: "none",
    status: "active",
    purpose: "Public ebook reader",
  },
  {
    pattern: "/e/:shortCode",
    family: "ebook",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "Short link for ebook reader",
  },
  {
    pattern: "/bio/:workspaceSlug/:pageSlug",
    family: "bio",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "conditional",
    auth: "none",
    status: "active",
    purpose: "Public bio/link-in-bio page",
  },
  {
    pattern: "/b/:shortCode",
    family: "bio",
    visibility: "public_hidden",
    owner: "marketing",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "Short link for public bio page",
  },
  {
    pattern: "/careers/:workspaceSlug/*",
    family: "careers",
    visibility: "public_hidden",
    owner: "product",
    menu: "none",
    seo: "conditional",
    auth: "optional",
    status: "review",
    purpose: "Public careers and worker portal routes",
  },

  // Technical and internal
  {
    pattern: "/install",
    family: "technical",
    visibility: "noindex",
    owner: "engineering",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "active",
    purpose: "PWA install helper route",
  },
  {
    pattern: "/builder/*",
    family: "technical",
    visibility: "legacy_redirect",
    owner: "engineering",
    menu: "none",
    seo: "noindex",
    auth: "none",
    status: "legacy",
    purpose: "Builder legacy shortcuts redirected to dashboard",
  },
  {
    pattern: "/dashboard/*",
    family: "dashboard",
    visibility: "auth_required",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "required",
    status: "active",
    purpose: "Authenticated CRM dashboard and app modules",
  },
  {
    pattern: "/messages",
    family: "dashboard",
    visibility: "auth_required",
    owner: "product",
    menu: "none",
    seo: "noindex",
    auth: "required",
    status: "active",
    purpose: "Internal messaging route",
  },
];

export function getPublicRouteVisibilityMatrix() {
  return PUBLIC_ROUTE_VISIBILITY_MATRIX;
}

export function getRoutesByVisibility(visibility: RouteVisibility) {
  return PUBLIC_ROUTE_VISIBILITY_MATRIX.filter((route) => route.visibility === visibility);
}

export function getRoutesByFamily(family: RouteFamily) {
  return PUBLIC_ROUTE_VISIBILITY_MATRIX.filter((route) => route.family === family);
}

export function getRoutesByMenu(menu: PublicRouteVisibilityRule["menu"]) {
  return PUBLIC_ROUTE_VISIBILITY_MATRIX.filter((route) => route.menu === menu);
}
