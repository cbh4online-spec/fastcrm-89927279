/**
 * Route Manifest — Single Source of Truth for FastCRM Navigation
 *
 * Every navigable page in the backoffice is declared here.
 * Sidebar, GlobalSearch, and command palette all consume this manifest.
 *
 * Rules:
 *  - href must match a real <Route> in src/routes/*.tsx
 *  - moduleSlug gates visibility when module is not installed (hidden, not disabled)
 *  - menuKey ties into useMenuPermissions for role-based access
 *  - visibleInSidebar = false keeps the route searchable but off the sidebar
 *
 * ─── AUDIT REPORT ────────────────────────────────────────────────────────────
 *
 * UNIMPLEMENTED / MISSING PAGES (status: "hidden"):
 *  - diagnostics (/dashboard/diagnostics) — No page file or route exists. Hidden from sidebar and search.
 *
 * FIXED HREFS:
 *  - system-health: /dashboard/system-health → /dashboard/system/health (matched real route)
 *
 * All other entries verified against src/routes/*.tsx — no further discrepancies found.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Newspaper, Gauge, Bell,
  Users, UserCheck, Building2, TrendingUp, GitBranch,
  MessageSquare, Briefcase, UserPlus, Zap, Phone,
  Inbox, Calendar, Send, FileText,
  Mail, Megaphone, Workflow, PenTool, Globe, Link2, Instagram,
  Receipt, Package, Layers, CreditCard, BarChart3, Target,
  ShoppingBag, Store, CheckSquare,
  CalendarDays, ShoppingCart, Truck, ClipboardList,
  Warehouse, FileQuestion, ListChecks, Upload,
  BookOpen, Bot, Sparkles, Brain, Crown, Cpu, ScanText,
  Home, Activity, Settings,
  UsersRound, KeyRound, Plug, FolderCog, ShieldCheck,
  HeartPulse, Stethoscope, Puzzle, Shield,
  Radio, Search, MapPin,
  ArrowUpDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NavGroup =
  | "inicio"
  | "comercial"
  | "comunicacao"
  | "marketing"
  | "vendas"
  | "comercio"
  | "operacoes"
  | "ai-strategy"
  | "inteligencia"
  | "administracao";

export interface NavGroupMeta {
  key: NavGroup;
  label: string;
  icon: LucideIcon;
  order: number;
  collapsible: boolean;
}

export interface RouteEntry {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  /** If true, only exact pathname match counts as active */
  end?: boolean;
  /** Marketplace module slug — item hidden when module not installed */
  moduleSlug?: string;
  /** Permission key from useMenuPermissions */
  menuKey?: string;
  /** Badge data key */
  badgeKey?: string;
  status: "active" | "hidden" | "disabled";
  visibleInSidebar: boolean;
  visibleInSearch: boolean;
  /** Pro / Agency badge */
  isPro?: boolean;
  /** Beta badge */
  isBeta?: boolean;
  /** Fallback route when target doesn't exist */
  fallbackRoute?: string;
}

// ─── Group Metadata ──────────────────────────────────────────────────────────

export const NAV_GROUPS: NavGroupMeta[] = [
  { key: "inicio",        label: "Início",        icon: LayoutDashboard, order: 1, collapsible: false },
  { key: "comercial",     label: "Comercial",     icon: Users,           order: 2, collapsible: true },
  { key: "comunicacao",   label: "Comunicação",   icon: Radio,           order: 3, collapsible: true },
  { key: "marketing",     label: "Marketing",     icon: Megaphone,       order: 4, collapsible: true },
  { key: "vendas",        label: "Vendas",        icon: TrendingUp,      order: 5, collapsible: true },
  { key: "comercio",      label: "Comércio",      icon: ShoppingBag,     order: 6, collapsible: true },
  { key: "operacoes",     label: "Operações",     icon: ClipboardList,   order: 7, collapsible: true },
  { key: "ai-strategy",   label: "AI Strategy",   icon: Crown,           order: 8, collapsible: true },
  { key: "inteligencia",  label: "Inteligência",  icon: Brain,           order: 9, collapsible: true },
  { key: "administracao", label: "Administração", icon: Settings,        order: 10, collapsible: true },
];

export const NAV_GROUP_ORDER: NavGroup[] = NAV_GROUPS.map((g) => g.key);

// ─── Helper to define entries concisely ──────────────────────────────────────

const e = (
  key: string,
  label: string,
  href: string,
  icon: LucideIcon,
  group: NavGroup,
  opts?: Partial<Omit<RouteEntry, "key" | "label" | "href" | "icon" | "group">>,
): RouteEntry => ({
  key,
  label,
  href,
  icon,
  group,
  status: "active",
  visibleInSidebar: true,
  visibleInSearch: true,
  ...opts,
});

// ─── ROUTE MANIFEST ──────────────────────────────────────────────────────────

export const ROUTE_MANIFEST: RouteEntry[] = [
  // ══════════════════════════════════════════════════════════════
  // INÍCIO
  // ══════════════════════════════════════════════════════════════
  e("dashboard",              "Dashboard",               "/dashboard",                       LayoutDashboard, "inicio", { end: true, menuKey: "dashboard" }),
  e("daily-brief",            "Daily Brief",             "/dashboard/daily-brief",           Newspaper,       "inicio"),
  e("revenue-flight-control", "Revenue Control",         "/dashboard/revenue-flight-control", Gauge,          "inicio"),
  e("alerts",                 "Alertas",                 "/dashboard/alerts",                Bell,            "inicio"),
  e("feed",                   "Feed",                    "/dashboard/feed",                  Newspaper,       "inicio", { visibleInSidebar: false, menuKey: "feed" }),
  e("productivity",           "Produtividade",           "/dashboard/productivity",          Target,          "inicio", { visibleInSidebar: false, menuKey: "productivity" }),

  // ══════════════════════════════════════════════════════════════
  // COMERCIAL
  // ══════════════════════════════════════════════════════════════
  e("leads",           "Leads",           "/dashboard/leads",          Users,         "comercial", { badgeKey: "new_leads", menuKey: "leads" }),
  e("contacts",        "Contactos",       "/dashboard/contacts",       UserCheck,     "comercial", { menuKey: "contacts" }),
  e("companies",       "Empresas",        "/dashboard/companies",      Building2,     "comercial", { menuKey: "companies" }),
  e("opportunities",   "Pipeline",        "/dashboard/opportunities",  TrendingUp,    "comercial", { menuKey: "pipeline" }),
  e("renewals",        "Renovações",      "/dashboard/renewals",       ArrowUpDown,   "comercial"),
  e("lifecycle",       "Ciclo de Vida",   "/dashboard/lifecycle",      GitBranch,     "comercial"),
  e("sequences",       "Sequências",      "/dashboard/sequences",      MessageSquare, "comercial"),
  e("account-brief",   "Account Brief",   "/dashboard/account-brief",  Briefcase,     "comercial", { moduleSlug: "account-brief", isPro: true }),
  e("prospecting",     "Prospecção",      "/dashboard/prospecting",    UserPlus,      "comercial", { moduleSlug: "prospecting-pro" }),
  e("lead-enricher",   "Lead Enricher",   "/dashboard/lead-enricher",  Search,        "comercial", { moduleSlug: "lead-enricher", isPro: true }),
  e("fastmatch",       "FastMatch",       "/dashboard/fastmatch",      Zap,           "comercial"),
  // Search-only CRM routes
  e("crm-hub",         "CRM",             "/dashboard/crm",            Users,         "comercial", { visibleInSidebar: false }),
  e("google-local",    "Google Local",    "/dashboard/prospecting/google-local", MapPin, "comercial", { visibleInSidebar: false, moduleSlug: "google-local-services" }),
  e("web-search-prosp","Web Search",      "/dashboard/prospecting/web-search",  Search, "comercial", { visibleInSidebar: false }),
  e("professional-prosp","Profissionais", "/dashboard/prospecting/professionals", Users, "comercial", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // COMUNICAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("inbox",       "Inbox",       "/dashboard/inbox",                    Inbox,     "comunicacao", { menuKey: "inbox" }),
  e("calendar",    "Calendário",  "/dashboard/scheduling",               Calendar,  "comunicacao", { badgeKey: "activities_today", menuKey: "calendar" }),
  e("followups",   "Follow-ups",  "/dashboard/scheduling?view=followups", Phone,    "comunicacao"),
  e("groups",      "Grupos",      "/dashboard/groups",                   Users,     "comunicacao"),
  e("telegram",    "Telegram",    "/dashboard/telegram",                 Send,      "comunicacao"),
  e("templates",   "Templates",   "/dashboard/communication/templates",  FileText,  "comunicacao"),

  // ══════════════════════════════════════════════════════════════
  // MARKETING
  // ══════════════════════════════════════════════════════════════
  e("email-campaigns", "Campanhas Email",  "/dashboard/email-campaigns",  Mail,      "marketing", { moduleSlug: "email-campaigns", menuKey: "marketing" }),
  e("marketing-hub",   "Marketing",        "/dashboard/marketing",        Megaphone, "marketing", { visibleInSidebar: false }),
  e("funnels",         "Funis",            "/dashboard/funnels",          Workflow,  "marketing"),
  e("form-studio",     "Formulários",      "/dashboard/form-studio",      PenTool,   "marketing"),
  e("seo",             "SEO",              "/dashboard/seo",              Globe,     "marketing", { moduleSlug: "seo-growth" }),
  e("bio-os",          "Bio OS",           "/dashboard/bio",              Link2,     "marketing", { moduleSlug: "bio-os" }),
  e("instagram-looter","Instagram Looter", "/dashboard/instagram-looter", Instagram, "marketing", { moduleSlug: "instagram-looter" }),

  // ══════════════════════════════════════════════════════════════
  // VENDAS
  // ══════════════════════════════════════════════════════════════
  e("proposals",    "Propostas",        "/dashboard/proposals",         FileText,    "vendas", { moduleSlug: "proposals", menuKey: "proposals" }),
  e("invoices",     "Faturas",          "/dashboard/invoices",          Receipt,     "vendas", { moduleSlug: "invoices", menuKey: "invoices" }),
  e("products",     "Produtos",         "/dashboard/products",          Package,     "vendas", { menuKey: "products" }),
  e("order-notes",  "Notas Encomenda",  "/dashboard/order-notes",       ClipboardList,"vendas"),
  e("bundles",      "Bundles",          "/dashboard/bundles",           Layers,      "vendas"),
  e("payments",     "Pagamentos",       "/dashboard/payments",          CreditCard,  "vendas", { visibleInSidebar: false }),
  e("packages",     "Pacotes",          "/dashboard/packages",          Package,     "vendas", { visibleInSidebar: false }),
  e("performance",  "Performance",      "/dashboard/performance",       BarChart3,   "vendas"),
  e("perf-goals",   "Metas",            "/dashboard/performance/goals", Target,      "vendas", { visibleInSidebar: false }),
  e("kpis",         "KPIs",             "/dashboard/kpis",              Gauge,       "vendas"),
  e("reports",      "Relatórios",       "/dashboard/reports",           BarChart3,   "vendas", { menuKey: "reports" }),
  e("strategy",     "Estratégia",       "/dashboard/strategy",          Brain,       "vendas", { visibleInSidebar: false }),
  e("checkout-admin","Checkout Admin",  "/dashboard/checkout-admin",    ShoppingCart, "vendas", { visibleInSidebar: false }),
  e("checkout",     "Checkout",         "/dashboard/checkout",          ShoppingCart, "vendas", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // COMÉRCIO
  // ══════════════════════════════════════════════════════════════
  // Loja Online
  e("store-orders",     "Loja - Encomendas",  "/dashboard/store-orders",     ShoppingBag,  "comercio", { moduleSlug: "online-store" }),
  e("store-products",   "Loja - Produtos",    "/dashboard/store-products",   Package,      "comercio", { moduleSlug: "online-store", visibleInSidebar: false }),
  e("store-categories", "Loja - Categorias",  "/dashboard/store-categories", Layers,       "comercio", { moduleSlug: "online-store", visibleInSidebar: false }),
  e("store-coupons",    "Loja - Cupões",      "/dashboard/store-coupons",    CreditCard,   "comercio", { moduleSlug: "online-store", visibleInSidebar: false }),
  e("store-analytics",  "Loja - Analytics",   "/dashboard/store-analytics",  BarChart3,    "comercio", { moduleSlug: "online-store", visibleInSidebar: false }),
  e("store-settings",   "Loja - Definições",  "/dashboard/store-settings",   Settings,     "comercio", { moduleSlug: "online-store", visibleInSidebar: false }),
  // C2C
  e("c2c",              "Marketplace C2C",    "/dashboard/c2c",              Store,        "comercio", { moduleSlug: "marketplace-c2c" }),
  // B2B
  e("b2b-portal",       "Portal B2B",         "/dashboard/b2b-portal",       Building2,    "comercio", { moduleSlug: "b2b-portal" }),
  e("b2b-approvals",    "Aprovações B2B",     "/dashboard/b2b/approvals",    CheckSquare,  "comercio", { moduleSlug: "b2b-portal" }),
  e("b2b-clients",      "Clientes B2B",       "/dashboard/b2b/clients",      Users,        "comercio", { moduleSlug: "b2b-portal" }),
  e("b2b-users",        "Users B2B",          "/dashboard/b2b/users",        UserCheck,    "comercio", { moduleSlug: "b2b-portal" }),
  e("b2b-plans",        "Planos B2B",         "/dashboard/b2b/plans",        Package,      "comercio", { moduleSlug: "b2b-portal" }),
  e("order-approvals",  "Aprovações Encomenda","/dashboard/order-approvals", CheckSquare,  "comercio", { visibleInSidebar: false }),
  e("client-users",     "Utilizadores Cliente","/dashboard/client-users",    Users,        "comercio", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // OPERAÇÕES
  // ══════════════════════════════════════════════════════════════
  e("tasks",                   "Tarefas",                "/dashboard/tasks",                        CheckSquare,   "operacoes"),
  e("events",                  "Eventos",                "/dashboard/events",                       CalendarDays,  "operacoes"),
  e("procurement",             "Procurement",            "/dashboard/procurement",                  ShoppingCart,  "operacoes", { moduleSlug: "procurement" }),
  e("procurement-suppliers",   "Fornecedores",           "/dashboard/procurement/suppliers",         Truck,        "operacoes", { moduleSlug: "procurement" }),
  e("procurement-requests",    "Pedidos",                "/dashboard/procurement/requests",          ClipboardList,"operacoes", { moduleSlug: "procurement" }),
  e("procurement-orders",      "Ordens de Compra",       "/dashboard/procurement/orders",            FileText,    "operacoes", { moduleSlug: "procurement" }),
  e("procurement-receipts",    "Receções",               "/dashboard/procurement/receipts",          Warehouse,   "operacoes", { moduleSlug: "procurement" }),
  e("procurement-rfqs",        "RFQs",                   "/dashboard/procurement/rfqs",              FileQuestion,"operacoes", { moduleSlug: "procurement" }),
  e("procurement-rfqs-dash",   "RFQs Dashboard",         "/dashboard/procurement/rfqs-dashboard",    BarChart3,   "operacoes", { moduleSlug: "procurement" }),
  e("procurement-needs",       "Needs Board",            "/dashboard/procurement/needs",             ListChecks,  "operacoes", { moduleSlug: "procurement" }),
  e("procurement-price-import","Import. Preços",         "/dashboard/procurement/price-import",      Upload,      "operacoes", { moduleSlug: "procurement", visibleInSidebar: false }),
  e("procurement-supplier-import","Import. Fornecedores","/dashboard/procurement/supplier-import",   Upload,      "operacoes", { moduleSlug: "procurement", visibleInSidebar: false }),
  e("imports",                 "Importações",            "/dashboard/imports",                       Upload,      "operacoes", { visibleInSidebar: false }),
  e("student-journey",         "Student Journey",        "/dashboard/student-journey",               Briefcase,   "operacoes", { moduleSlug: "student-journey" }),
  e("security",                "Segurança",              "/dashboard/security",                      Shield,      "operacoes", { moduleSlug: "security-ops", visibleInSidebar: false }),
  e("credit",                  "Crédito",                "/dashboard/credit",                        CreditCard,  "operacoes", { moduleSlug: "credit-intermediation", visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // INTELIGÊNCIA
  // ══════════════════════════════════════════════════════════════
  e("knowledge-base",      "Knowledge Base",       "/dashboard/knowledge",              BookOpen,       "inteligencia"),
  e("ai-assistants",       "AI Assistentes",       "/dashboard/ai-assistants",          Bot,            "inteligencia"),
  e("ai-employees",        "AI Employees",         "/dashboard/ai-employees",           Users,          "inteligencia"),
  e("conversational-engine","Motor Conversacional", "/dashboard/conversational-engine",  MessageSquare,  "inteligencia"),
  e("ai-suggestions",      "AI Sugestões",         "/dashboard/ai-suggestions",         Sparkles,       "inteligencia"),
  e("ai-sales-coach",      "AI Sales Coach",       "/dashboard/ai-sales-coach",         Brain,          "ai-strategy"),
  e("ai-agents",           "AI Agents",            "/dashboard/ai-agents",              Cpu,            "inteligencia"),
  e("ai-document-ocr",     "Document OCR",         "/dashboard/ai-document-ocr",        ScanText,       "inteligencia"),
  e("ceo-copilot",         "CEO Copilot",          "/dashboard/ceo-copilot",            Crown,          "ai-strategy"),
  e("context-os",          "Context OS",           "/dashboard/context-os",             Brain,          "ai-strategy"),
  e("impact-map",          "Change Impact Map",    "/dashboard/impact-map",             Activity,       "inteligencia"),
  e("kernel",              "FastCRM Kernel",       "/dashboard/kernel",                 Cpu,            "inteligencia"),
  e("ai-operations",       "AI Operations",        "/dashboard/ai-operations",          Activity,       "inteligencia", { visibleInSidebar: false }),
  e("ai-settings",         "AI Settings",          "/dashboard/ai-settings",            Settings,       "inteligencia", { visibleInSidebar: false }),
  e("ai-usage",            "AI Usage",             "/dashboard/ai-usage",               BarChart3,      "inteligencia", { visibleInSidebar: false }),
  e("imo-ai",              "IMO AI",               "/dashboard/imo-ai",                 Home,           "inteligencia", { moduleSlug: "imo-ai" }),

  // ══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("settings-team",         "Equipa",          "/settings/team",              UsersRound,   "administracao", { menuKey: "team" }),
  e("settings-permissions",  "Permissões",      "/settings/permissions",       KeyRound,     "administracao"),
  e("settings-billing",      "Faturação",       "/settings/billing",           CreditCard,   "administracao"),
  e("settings-integrations", "Integrações",     "/settings/integrations",      Plug,         "administracao", { menuKey: "integrations" }),
  e("settings-workspace",    "Workspace",       "/settings/workspace",         FolderCog,    "administracao"),
  e("settings-roles",        "Roles",           "/settings/roles",             ShieldCheck,  "administracao"),
  e("marketplace",           "Marketplace",     "/dashboard/marketplace",      Puzzle,       "administracao"),
  e("diagnostics",           "Diagnósticos",    "/dashboard/diagnostics",      Stethoscope,  "administracao", { status: "hidden", visibleInSidebar: false, visibleInSearch: false }),
  e("system-health",         "System Health",   "/dashboard/system/health",    HeartPulse,   "administracao"),
  e("super-admin",           "Super Admin",     "/super-admin",                Shield,       "administracao"),
  // Search-only admin routes
  e("settings-main",  "Definições",    "/settings",                Settings,       "administracao", { visibleInSidebar: false, menuKey: "settings" }),
  e("profile",        "Perfil",        "/dashboard/profile",       UserCheck,      "administracao", { visibleInSidebar: false }),
  e("member-panel",   "Painel Membro", "/dashboard/member",        Users,          "administracao", { visibleInSidebar: false }),
  e("notifications",  "Notificações",  "/dashboard/notifications", Bell,           "administracao", { visibleInSidebar: false }),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get sidebar-visible entries for a specific group, filtered by installed modules & permissions */
export function getSidebarItems(
  group: NavGroup,
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean,
): RouteEntry[] {
  const installed = new Set(installedModuleSlugs);
  return ROUTE_MANIFEST.filter((r) => {
    if (r.group !== group) return false;
    if (!r.visibleInSidebar) return false;
    if (r.status !== "active") return false;
    if (r.moduleSlug && !installed.has(r.moduleSlug)) return false;
    if (r.menuKey && !canAccess(r.menuKey)) return false;
    return true;
  });
}

/** Get all searchable routes (for GlobalSearch / command palette) */
export function getSearchableRoutes(
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean,
): RouteEntry[] {
  const installed = new Set(installedModuleSlugs);
  return ROUTE_MANIFEST.filter((r) => {
    if (!r.visibleInSearch) return false;
    if (r.status !== "active") return false;
    if (r.moduleSlug && !installed.has(r.moduleSlug)) return false;
    if (r.menuKey && !canAccess(r.menuKey)) return false;
    return true;
  });
}

/** Flat list of all page entries for search (unfiltered — used by GlobalSearch) */
export function getAllSearchablePages(): { path: string; label: string; icon: LucideIcon }[] {
  return ROUTE_MANIFEST
    .filter((r) => r.visibleInSearch && r.status === "active")
    .map((r) => ({ path: r.href, label: r.label, icon: r.icon }));
}

/** Build sidebar sections with group metadata, hiding empty groups */
export function buildSidebarSections(
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean,
): Array<NavGroupMeta & { items: RouteEntry[] }> {
  return NAV_GROUPS
    .map((g) => ({
      ...g,
      items: getSidebarItems(g.key, installedModuleSlugs, canAccess),
    }))
    .filter((g) => g.items.length > 0);
}
