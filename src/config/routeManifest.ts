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
  ArrowUpDown, Headphones, Clock, Timer,
  Facebook, LayoutGrid, Award, ClipboardCheck, UserSearch, Video, CalendarCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NavGroup =
  | "inicio"
  | "comercial"
  | "comunicacao"
  | "marketing"
  | "vendas"
  | "compras"
  | "suporte"
  | "rh"
  | "loja-online"
  | "marketplace-c2c"
  | "portal-b2b"
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
  { key: "ai-strategy",   label: "Estratégia IA",   icon: Crown,           order: 2, collapsible: false },
  { key: "comercial",     label: "Comercial",     icon: Users,           order: 3, collapsible: true },
  { key: "comunicacao",   label: "Comunicação",   icon: Radio,           order: 4, collapsible: true },
  { key: "marketing",     label: "Marketing",     icon: Megaphone,       order: 5, collapsible: true },
  { key: "vendas",        label: "Vendas",        icon: TrendingUp,      order: 6, collapsible: true },
  { key: "compras",          label: "Compras",          icon: ShoppingCart,    order: 7,  collapsible: true },
  { key: "suporte",          label: "Suporte",          icon: Headphones,      order: 8,  collapsible: true },
  { key: "rh",               label: "People Operations",    icon: Clock,           order: 9,  collapsible: true },
  { key: "loja-online",      label: "Loja Online",      icon: ShoppingBag,     order: 10, collapsible: true },
  { key: "marketplace-c2c",  label: "Marketplace C2C",  icon: Store,           order: 11, collapsible: true },
  { key: "portal-b2b",       label: "Portal B2B",       icon: Building2,       order: 12, collapsible: true },
  { key: "operacoes",        label: "Operações",        icon: ClipboardList,   order: 13, collapsible: true },
  { key: "inteligencia",     label: "Inteligência",     icon: Brain,           order: 14, collapsible: true },
  { key: "administracao",    label: "Administração",    icon: Settings,        order: 15, collapsible: true },
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
  e("daily-brief",            "Briefing Diário",         "/dashboard/daily-brief",           Newspaper,       "ai-strategy"),
  e("revenue-flight-control", "Controlo de Receita",     "/dashboard/revenue-flight-control", Gauge,          "ai-strategy"),
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
  e("account-brief",   "Briefing Conta",  "/dashboard/account-brief",  Briefcase,     "comercial", { moduleSlug: "account-brief", isPro: true }),
  e("prospecting",     "Prospecção",      "/dashboard/prospecting",    UserPlus,      "comercial", { moduleSlug: "prospecting-pro" }),
  e("lead-enricher",   "Enriquecimento de Leads", "/dashboard/lead-enricher",  Search,        "comercial", { moduleSlug: "lead-enricher", isPro: true }),
  e("fastmatch",       "FastMatch",       "/dashboard/fastmatch",      Zap,           "comercial"),
  // Search-only CRM routes
  e("crm-hub",         "CRM",             "/dashboard/crm",            Users,         "comercial", { visibleInSidebar: false }),
  e("google-local",    "Google Local",    "/dashboard/prospecting/google-local", MapPin, "comercial", { visibleInSidebar: false, moduleSlug: "google-local-services" }),
  e("web-search-prosp","Pesquisa Web",    "/dashboard/prospecting/web-search",  Search, "comercial", { visibleInSidebar: false }),
  e("professional-prosp","Profissionais", "/dashboard/prospecting/professionals", Users, "comercial", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // COMUNICAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("inbox",       "Caixa de Entrada", "/dashboard/inbox",                Inbox,     "comunicacao", { menuKey: "inbox" }),
  e("calendar",    "Calendário",  "/dashboard/scheduling",               Calendar,  "comunicacao", { badgeKey: "activities_today", menuKey: "calendar" }),
  e("followups",   "Seguimentos", "/dashboard/scheduling?view=followups", Phone,    "comunicacao"),
  e("groups",      "Grupos",      "/dashboard/groups",                   Users,     "comunicacao"),
  e("telegram",    "Telegram",    "/dashboard/telegram",                 Send,      "comunicacao"),
  e("templates",   "Modelos",     "/dashboard/communication/templates",  FileText,  "comunicacao"),

  // ══════════════════════════════════════════════════════════════
  // MARKETING
  // ══════════════════════════════════════════════════════════════
  e("email-campaigns", "Campanhas Email",  "/dashboard/email-campaigns",  Mail,      "marketing", { moduleSlug: "email-campaigns", menuKey: "marketing" }),
  e("marketing-hub",   "Marketing",        "/dashboard/marketing",        Megaphone, "marketing", { visibleInSidebar: false }),
  e("conversion-hub",  "Funis & Landing Pages", "/dashboard/conversion", Workflow, "marketing"),
  e("funnels",         "Funis",            "/dashboard/funnels",          Workflow,  "marketing", { visibleInSidebar: false }),
  e("landing-pages",   "Landing Pages",    "/dashboard/landing-pages",    Globe,     "marketing", { visibleInSidebar: false }),
  e("ebooks",          "eBooks",           "/dashboard/ebooks",           BookOpen,  "marketing"),
  e("ebook-templates", "Templates eBooks", "/dashboard/ebooks/templates",  LayoutGrid, "marketing", { visibleInSidebar: false }),
  e("ebook-templates-admin", "Gerir Templates", "/dashboard/ebooks/templates/admin", LayoutGrid, "marketing", { visibleInSidebar: false }),
  e("form-studio",     "Formulários",      "/dashboard/form-studio",      PenTool,   "marketing"),
  e("seo",             "SEO",              "/dashboard/seo",              Globe,     "marketing", { moduleSlug: "seo-growth" }),
  e("bio-os",          "Bio OS",           "/dashboard/bio",              Link2,     "marketing", { moduleSlug: "bio-os" }),
  e("instagram-looter","Instagram Looter","/dashboard/instagram-looter", Instagram, "marketing", { moduleSlug: "instagram-looter" }),
  e("meta-module",     "Meta",            "/dashboard/meta",             Facebook,  "marketing", { moduleSlug: "meta-module" }),
  e("sponsors",        "Sponsors / Parceiros", "/dashboard/sponsors",    Award,     "marketing"),

  // ══════════════════════════════════════════════════════════════
  // VENDAS
  // ══════════════════════════════════════════════════════════════
  e("proposals",    "Propostas",        "/dashboard/proposals",         FileText,    "vendas", { moduleSlug: "proposals", menuKey: "proposals" }),
  e("invoices",     "Faturas",          "/dashboard/invoices",          Receipt,     "vendas", { moduleSlug: "invoices", menuKey: "invoices" }),
  e("products",     "Produtos",         "/dashboard/products",          Package,     "vendas", { menuKey: "products" }),
  e("order-notes",  "Notas Encomenda",  "/dashboard/order-notes",       ClipboardList,"vendas"),
  e("bundles",      "Pacotes",          "/dashboard/bundles",           Layers,      "vendas"),
  e("payments",     "Pagamentos",       "/dashboard/payments",          CreditCard,  "vendas"),
  e("packages",     "Pacotes",          "/dashboard/packages",          Package,     "vendas", { visibleInSidebar: false }),
  e("performance",  "Performance",      "/dashboard/performance",       BarChart3,   "vendas"),
  e("perf-metrics", "Métricas & Metas", "/dashboard/performance/metrics", BarChart3, "vendas"),
  e("kpis",         "KPIs",             "/dashboard/kpis",              Gauge,       "vendas"),
  e("reports",      "Relatórios",       "/dashboard/reports",           BarChart3,   "vendas", { menuKey: "reports" }),
  e("strategy",     "Estratégia",       "/dashboard/strategy",          Brain,       "vendas", { visibleInSidebar: false }),
  e("checkout-admin","Admin Checkout",  "/dashboard/checkout-admin",    ShoppingCart, "vendas", { visibleInSidebar: false }),
  e("checkout",     "Checkout",         "/dashboard/checkout",          ShoppingCart, "vendas", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // LOJA ONLINE (B2C)
  // ══════════════════════════════════════════════════════════════
  e("store-orders",     "Encomendas",     "/dashboard/store-orders",     ShoppingBag,  "loja-online", { moduleSlug: "online-store" }),
  e("store-products",   "Produtos",       "/dashboard/store-products",   Package,      "loja-online", { moduleSlug: "online-store" }),
  e("store-categories", "Categorias",     "/dashboard/store-categories", Layers,       "loja-online", { moduleSlug: "online-store" }),
  e("store-coupons",    "Cupões",         "/dashboard/store-coupons",    CreditCard,   "loja-online", { moduleSlug: "online-store" }),
  e("store-analytics",  "Analíticas",     "/dashboard/store-analytics",  BarChart3,    "loja-online", { moduleSlug: "online-store" }),
  e("store-settings",   "Definições",     "/dashboard/store-settings",   Settings,     "loja-online", { moduleSlug: "online-store" }),

  // ══════════════════════════════════════════════════════════════
  // MARKETPLACE C2C
  // ══════════════════════════════════════════════════════════════
  e("c2c",              "Marketplace C2C", "/dashboard/c2c",             Store,        "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),

  // ══════════════════════════════════════════════════════════════
  // PORTAL B2B
  // ══════════════════════════════════════════════════════════════
  e("b2b-portal",       "Portal B2B",          "/dashboard/b2b-portal",       Building2,    "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-approvals",    "Aprovações",          "/dashboard/b2b/approvals",    CheckSquare,  "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-clients",      "Clientes",            "/dashboard/b2b/clients",      Users,        "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-users",        "Utilizadores",        "/dashboard/b2b/users",        UserCheck,    "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-plans",        "Planos",              "/dashboard/b2b/plans",        Package,      "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("order-approvals",  "Aprovações Encomenda","/dashboard/order-approvals",  CheckSquare,  "portal-b2b", { visibleInSidebar: false }),
  e("client-users",     "Utilizadores Cliente","/dashboard/client-users",     Users,        "portal-b2b", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // SUPORTE (Helpdesk)
  // ══════════════════════════════════════════════════════════════
  e("helpdesk",               "Dashboard Suporte",    "/dashboard/helpdesk",                   Headphones,  "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-tickets",       "Tickets",              "/dashboard/helpdesk/tickets",            Headphones,  "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-canned",        "Respostas Rápidas",    "/dashboard/helpdesk/canned-responses",   Zap,         "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-sla",            "Políticas SLA",        "/dashboard/helpdesk/sla-policies",       Clock,       "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-automations",   "Automações",           "/dashboard/helpdesk/automations",        Zap,         "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-kb",             "Base de Conhecimento", "/dashboard/helpdesk/knowledge-base",     BookOpen,    "suporte", { moduleSlug: "helpdesk" }),
  e("helpdesk-csat",           "Satisfação (CSAT)",    "/dashboard/helpdesk/csat",               Award,       "suporte", { moduleSlug: "helpdesk" }),

  // Client Tickets (B2B Portal)
  e("client-tickets",          "Tickets Clientes",     "/dashboard/tickets",                    Headphones,  "portal-b2b"),
  e("client-tickets-dashboard","Dashboard Tickets",    "/dashboard/tickets/dashboard",           Gauge,       "portal-b2b", { visibleInSidebar: false }),
  e("client-tickets-settings", "Config. Tickets",      "/dashboard/tickets/settings",            Settings,    "portal-b2b", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // RH (Recursos Humanos)
  // ══════════════════════════════════════════════════════════════
  e("hr-dashboard",     "Visão Geral",         "/dashboard/hr",               LayoutDashboard, "rh", { moduleSlug: "hr-management" }),
  e("hr-employees",     "Funcionários",        "/dashboard/hr/employees",     Users,        "rh", { moduleSlug: "hr-management" }),
  e("hr-departments",   "Departamentos",       "/dashboard/hr/departments",   Building2,    "rh", { moduleSlug: "hr-management" }),
  e("hr-positions",     "Cargos",              "/dashboard/hr/positions",     Briefcase,    "rh", { moduleSlug: "hr-management" }),
  e("hr-time-tracking", "Controlo de Ponto",   "/dashboard/hr/time-tracking", Clock,        "rh", { moduleSlug: "hr-management" }),
  e("hr-schedules",     "Gestão de Turnos",    "/dashboard/hr/schedules",     Calendar,     "rh", { moduleSlug: "hr-management" }),
  e("hr-absences",      "Férias & Ausências",  "/dashboard/hr/absences",      CalendarDays, "rh", { moduleSlug: "hr-management" }),
  e("hr-kiosk",         "Terminal QR",         "/dashboard/hr/kiosk",         Activity,     "rh", { moduleSlug: "hr-management" }),
  e("hr-settings",      "Configurações RH",   "/dashboard/hr/settings",      Settings,     "rh", { moduleSlug: "hr-management" }),
  e("hr-onboarding",    "Onboarding",          "/dashboard/hr/onboarding",    UserCheck,    "rh", { moduleSlug: "hr-management" }),
  // Recruitment
  e("hr-recruitment",           "Recrutamento",              "/dashboard/hr/recruitment",              UserSearch, "rh", { moduleSlug: "hr-management" }),
  e("hr-recruitment-jobs",      "Vagas",                     "/dashboard/hr/recruitment/jobs",         Briefcase,  "rh", { moduleSlug: "hr-management" }),
  e("hr-recruitment-job-detail","Detalhe da Vaga",           "/dashboard/hr/recruitment/jobs/:id",     Briefcase,  "rh", { moduleSlug: "hr-management", visibleInSidebar: false }),
  e("hr-recruitment-candidates","Candidatos",                "/dashboard/hr/recruitment/candidates",   Users,      "rh", { moduleSlug: "hr-management" }),
  e("hr-recruitment-candidate", "Ficha do Candidato",        "/dashboard/hr/recruitment/candidates/:id", Users,    "rh", { moduleSlug: "hr-management", visibleInSidebar: false }),
  e("hr-recruitment-interviews","Entrevistas",               "/dashboard/hr/recruitment/interviews",   Video,      "rh", { moduleSlug: "hr-management" }),
  // Performance & OKRs
  e("hr-okrs",          "OKRs",                "/dashboard/hr/okrs",          Target,       "rh", { moduleSlug: "hr-management" }),
  e("hr-feedback",      "Feedback",            "/dashboard/hr/feedback",      MessageSquare,"rh", { moduleSlug: "hr-management" }),
  e("hr-checkins",      "Check-ins",           "/dashboard/hr/checkins",      CalendarCheck,"rh", { moduleSlug: "hr-management" }),
  e("hr-reviews",       "Avaliações",          "/dashboard/hr/reviews",       ClipboardCheck,"rh", { moduleSlug: "hr-management" }),

  // ══════════════════════════════════════════════════════════════
  // OPERAÇÕES
  // ══════════════════════════════════════════════════════════════
  e("tasks",                   "Tarefas",                "/dashboard/tasks",                        CheckSquare,   "operacoes"),
  e("events",                  "Eventos",                "/dashboard/events",                       CalendarDays,  "operacoes"),
  e("imports",                 "Importações",            "/dashboard/imports",                       Upload,      "operacoes", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // COMPRAS
  // ══════════════════════════════════════════════════════════════
  e("procurement",             "Dashboard Compras",      "/dashboard/procurement",                  ShoppingCart,  "compras", { moduleSlug: "procurement" }),
  e("procurement-suppliers",   "Fornecedores",           "/dashboard/procurement/suppliers",         Truck,        "compras", { moduleSlug: "procurement" }),
  e("procurement-needs",       "Quadro Necessidades",    "/dashboard/procurement/needs",             ListChecks,  "compras", { moduleSlug: "procurement" }),
  e("procurement-requests",    "Pedidos",                "/dashboard/procurement/requests",          ClipboardList,"compras", { moduleSlug: "procurement" }),
  e("procurement-orders",      "Ordens de Compra",       "/dashboard/procurement/orders",            FileText,    "compras", { moduleSlug: "procurement" }),
  e("procurement-receipts",    "Receções",               "/dashboard/procurement/receipts",          Warehouse,   "compras", { moduleSlug: "procurement" }),
  e("procurement-rfqs",        "RFQs",                   "/dashboard/procurement/rfqs",              FileQuestion,"compras", { moduleSlug: "procurement" }),
  e("procurement-rfqs-dash",   "Dashboard RFQs",         "/dashboard/procurement/rfqs-dashboard",    BarChart3,   "compras", { moduleSlug: "procurement" }),
  e("procurement-price-import","Import. Preços",         "/dashboard/procurement/price-import",      Upload,      "compras", { moduleSlug: "procurement", visibleInSidebar: false }),
  e("procurement-supplier-import","Import. Fornecedores","/dashboard/procurement/supplier-import",   Upload,      "compras", { moduleSlug: "procurement", visibleInSidebar: false }),
  e("student-journey",         "Jornada do Aluno",       "/dashboard/student-journey",               Briefcase,   "operacoes", { moduleSlug: "student-journey" }),
  e("security",                "Segurança",              "/dashboard/security",                      Shield,      "operacoes", { moduleSlug: "security-ops", visibleInSidebar: false }),
  e("credit",                  "Crédito",                "/dashboard/credit",                        CreditCard,  "operacoes", { moduleSlug: "credit-intermediation", visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // INTELIGÊNCIA
  // ══════════════════════════════════════════════════════════════
  e("knowledge-base",      "Base de Conhecimento", "/dashboard/knowledge",              BookOpen,       "inteligencia"),
  e("ai-assistants",       "Assistentes IA",      "/dashboard/ai-assistants",          Bot,            "inteligencia"),
  e("ai-employees",        "Colaboradores IA",    "/dashboard/ai-employees",           Users,          "inteligencia"),
  e("conversational-engine","Motor Conversacional","/dashboard/conversational-engine",  MessageSquare,  "inteligencia"),
  e("ai-suggestions",      "Sugestões IA",        "/dashboard/ai-suggestions",         Sparkles,       "inteligencia"),
  e("ai-sales-coach",      "Coach de Vendas IA",  "/dashboard/ai-sales-coach",         Brain,          "ai-strategy"),
  e("ai-agents",           "Agentes IA",          "/dashboard/ai-agents",              Cpu,            "inteligencia"),
  e("ai-document-ocr",     "OCR Documentos",      "/dashboard/ai-document-ocr",        ScanText,       "inteligencia"),
  e("ceo-copilot",         "Copiloto CEO",        "/dashboard/ceo-copilot",            Crown,          "ai-strategy"),
  e("context-os",          "Context OS",          "/dashboard/context-os",             Brain,          "ai-strategy"),
  e("impact-map",          "Mapa de Impacto",     "/dashboard/impact-map",             Activity,       "inteligencia"),
  e("kernel",              "FastCRM Kernel",      "/dashboard/kernel",                 Cpu,            "inteligencia"),
  e("ai-operations",       "Operações IA",        "/dashboard/ai-operations",          Activity,       "inteligencia", { visibleInSidebar: false }),
  e("ai-settings",         "Definições IA",       "/dashboard/ai-settings",            Settings,       "inteligencia", { visibleInSidebar: false }),
  e("ai-usage",            "Utilização IA",       "/dashboard/ai-usage",               BarChart3,      "inteligencia", { visibleInSidebar: false }),
  e("imo-ai",              "IMO AI",               "/dashboard/imo-ai",                 Home,           "inteligencia", { moduleSlug: "imo-ai" }),

  // ══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("settings-team",         "Equipa",          "/settings/team",              UsersRound,   "administracao", { menuKey: "team" }),
  e("settings-permissions",  "Permissões",      "/settings/permissions",       KeyRound,     "administracao"),
  e("settings-billing",      "Faturação",       "/settings/billing",           CreditCard,   "administracao"),
  e("settings-integrations", "Integrações",     "/settings/integrations",      Plug,         "administracao", { menuKey: "integrations" }),
  e("settings-workspace",    "Workspace",       "/settings/workspace",         FolderCog,    "administracao"),
  e("settings-roles",        "Papéis",          "/settings/roles",             ShieldCheck,  "administracao"),
  e("marketplace",           "Marketplace",     "/dashboard/marketplace",      Puzzle,       "administracao"),
  e("diagnostics",           "Diagnósticos",    "/dashboard/diagnostics",      Stethoscope,  "administracao", { status: "hidden", visibleInSidebar: false, visibleInSearch: false }),
  e("system-health",         "Saúde do Sistema","/dashboard/system/health",    HeartPulse,   "administracao"),
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
