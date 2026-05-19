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
  LayoutDashboard, Newspaper, Gauge, Bell, RotateCcw,
  Users, UserCheck, Building2, TrendingUp, GitBranch,
  MessageSquare, Briefcase, UserPlus, Zap, Phone,
  Inbox, Calendar, Send, FileText, Presentation,
  Mail, Megaphone, Workflow, PenTool, Globe, Link2, Instagram,
  Receipt, Package, Layers, CreditCard, BarChart3, Target, Coins,
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
  Trophy, Flame, Star, Tv, Wrench, FileCheck, AlertTriangle, Landmark,
  Eye, Rocket, ShoppingBasket, UserCog, Gavel, Boxes, ChefHat, Heart, Repeat,
  Wand2, HandCoins,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NavGroup =
  | "inicio"
  | "comercial"
  | "agenda"
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
  | "seguranca"
  | "performance"
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
  { key: "agenda",        label: "Agenda",        icon: Calendar,        order: 35, collapsible: true },
  { key: "comunicacao",   label: "Comunicação",   icon: Radio,           order: 4, collapsible: true },
  { key: "performance",   label: "Performance",   icon: Trophy,          order: 5, collapsible: true },
  { key: "marketing",     label: "Marketing",     icon: Megaphone,       order: 6, collapsible: true },
  { key: "vendas",        label: "Vendas",        icon: TrendingUp,      order: 7, collapsible: true },
  { key: "compras",          label: "Compras",          icon: ShoppingCart,    order: 8,  collapsible: true },
  { key: "suporte",          label: "Suporte",          icon: Headphones,      order: 9,  collapsible: true },
  { key: "rh",               label: "People Operations",    icon: Clock,           order: 10,  collapsible: true },
  { key: "loja-online",      label: "Loja Online",      icon: ShoppingBag,     order: 11, collapsible: true },
  { key: "marketplace-c2c",  label: "Marketplace C2C",  icon: Store,           order: 12, collapsible: true },
  { key: "portal-b2b",       label: "Portal B2B",       icon: Building2,       order: 13, collapsible: true },
  { key: "seguranca",        label: "Segurança",        icon: Shield,          order: 14, collapsible: true },
  { key: "operacoes",        label: "Operações",        icon: ClipboardList,   order: 15, collapsible: true },
  { key: "inteligencia",     label: "Inteligência",     icon: Brain,           order: 16, collapsible: true },
  { key: "administracao",    label: "Administração",    icon: Settings,        order: 17, collapsible: true },
];

export const NAV_GROUP_ORDER: NavGroup[] = NAV_GROUPS.map((g) => g.key);

// ─── Helper to define entries concisely ──────────────────────────────────────

const e = (
  key: string,
  label: string,
  href: string,
  icon: LucideIcon,
  group: NavGroup,
  opts?: Partial<Omit<RouteEntry, "key" | "label" | "href" | "icon" | "group">>): RouteEntry => ({
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
  e("feed",                   "Feed",                    "/dashboard/feed",                  Newspaper,       "inicio", { menuKey: "feed" }),
  e("productivity",           "Produtividade",           "/dashboard/productivity",          Target,          "inicio", { menuKey: "productivity" }),

  // ══════════════════════════════════════════════════════════════
  // COMERCIAL
  // ══════════════════════════════════════════════════════════════
  e("leads",           "Leads",           "/dashboard/leads",          Users,         "comercial", { badgeKey: "new_leads", menuKey: "leads" }),
  e("contacts",        "Contactos",       "/dashboard/contacts",       UserCheck,     "comercial", { menuKey: "contacts" }),
  e("companies",       "Empresas",        "/dashboard/companies",      Building2,     "comercial", { menuKey: "companies" }),
  e("gestores",        "Gestores",        "/dashboard/gestores",       UsersRound,    "comercial"),
  e("opportunities",   "Pipeline",        "/dashboard/opportunities",  TrendingUp,    "comercial", { menuKey: "pipeline" }),
  e("renewals",        "Renovações",      "/dashboard/renewals",       ArrowUpDown,   "comercial"),
  e("lifecycle",       "Ciclo de Vida",   "/dashboard/lifecycle",      GitBranch,     "comercial"),
  e("sequences",       "Sequências",      "/dashboard/sequences",      MessageSquare, "comercial"),
  e("account-brief",   "Briefing Conta",  "/dashboard/account-brief",  Briefcase,     "comercial", { moduleSlug: "account-brief", isPro: true }),
  e("prospecting",     "Prospecção",      "/dashboard/prospecting",    UserPlus,      "comercial", { moduleSlug: "prospecting-pro" }),
  e("lead-enricher",   "Enriquecimento de Leads", "/dashboard/lead-enricher",  Search,        "comercial", { moduleSlug: "lead-enricher", isPro: true }),
  e("fastmatch",       "FastMatch",       "/dashboard/fastmatch",      Zap,           "comercial"),
 e("leadchef",        "LeadChef",        "/dashboard/leadchef/today", ChefHat,       "comercial", { isBeta: true }),
 e("leadchef-admin",  "Centro LeadChef", "/dashboard/leadchef/admin", Settings,      "comercial", { isBeta: true }),
 e("leadchef-embaixador", "Embaixadores LeadChef", "/embaixador/dashboard", Trophy, "comercial", { isBeta: true }),
  // Search-only CRM routes
  e("crm-hub",         "CRM",             "/dashboard/crm",            Users,         "comercial", { visibleInSidebar: false }),
  e("google-local",    "Google Local",    "/dashboard/prospecting/google-local", MapPin, "comercial", { moduleSlug: "google-local-services" }),
  e("web-search-prosp","Pesquisa Web",    "/dashboard/prospecting/web-search",  Search, "comercial", { visibleInSidebar: false }),
  e("professional-prosp","Profissionais", "/dashboard/prospecting/professionals", Users, "comercial", { visibleInSidebar: false }),

  // ══════════════════════════════════════════════════════════════
  // AGENDA (Departamento: planeamento e seguimentos)
  // ══════════════════════════════════════════════════════════════
  e("calendar",          "Calendário",            "/dashboard/scheduling",                Calendar,  "agenda", { badgeKey: "activities_today", menuKey: "calendar" }),
  e("followups",         "Seguimentos",           "/dashboard/scheduling?view=followups", Phone,     "agenda"),
  e("whatsapp-scheduled","Mensagens Agendadas",   "/dashboard/whatsapp-pro/scheduled",    Calendar,  "agenda", { moduleSlug: "whatsapp-business" }),
  e("whatsapp-recurring","Campanhas Recorrentes", "/dashboard/whatsapp-pro/recurring",    Repeat,    "agenda", { moduleSlug: "whatsapp-business" }),

  // ══════════════════════════════════════════════════════════════
  // COMUNICAÇÃO (Departamento: canais e conversas)
  // Sub-páginas WhatsApp acessíveis via hub "WhatsApp Pro" — ocultas do sidebar mas pesquisáveis
  // ══════════════════════════════════════════════════════════════
  e("inbox",            "Caixa de Entrada",   "/dashboard/inbox",                  Inbox,         "comunicacao", { menuKey: "inbox" }),
  e("whatsapp-pro",     "WhatsApp",           "/dashboard/whatsapp-pro",           MessageSquare, "comunicacao", { moduleSlug: "whatsapp-business" }),
  e("whatsapp-inbox",   "Inbox WhatsApp",     "/dashboard/whatsapp-pro/inbox",     Inbox,         "comunicacao", { moduleSlug: "whatsapp-business" }),
  e("whatsapp-campaigns","Campanhas WhatsApp","/dashboard/whatsapp-pro/campaigns", Send,          "comunicacao", { moduleSlug: "whatsapp-business" }),
  e("telegram",         "Telegram",           "/dashboard/telegram",               Send,          "comunicacao"),
  e("voicehub",         "VoiceHub",           "/dashboard/voicehub",               Headphones,    "comunicacao"),
  e("groups",           "Grupos",             "/dashboard/groups",                 Users,         "comunicacao"),
  e("templates",        "Modelos",            "/dashboard/communication/templates",FileText,      "comunicacao"),
  // Sub-páginas WhatsApp — ocultas do sidebar (acessíveis via hub /dashboard/whatsapp-pro)
  e("whatsapp-analytics",      "Métricas WhatsApp",          "/dashboard/whatsapp-pro/analytics",       BarChart3,   "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-templates",      "Templates WhatsApp",         "/dashboard/whatsapp-pro/templates",       FileText,    "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-sequences",      "Sequências WhatsApp",        "/dashboard/whatsapp-pro/sequences",       Workflow,    "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-quick-replies",  "Quick Replies WhatsApp",     "/dashboard/whatsapp-pro/quick-replies",   Zap,         "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-catalog",        "Catálogo WhatsApp",          "/dashboard/whatsapp-pro/catalog",         Package,     "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-bot-rules",      "Bot WhatsApp",               "/dashboard/whatsapp-pro/bot-rules",       Bot,         "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-contacts-import","Importar Contactos WhatsApp","/dashboard/whatsapp-pro/contacts-import", Upload,      "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-segments",       "Segmentos WhatsApp",         "/dashboard/whatsapp-pro/segments",        Target,      "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-consent",        "Consentimento WhatsApp",     "/dashboard/whatsapp-pro/consent",         ShieldCheck, "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-quick-templates","Templates Rápidos WhatsApp", "/dashboard/whatsapp-pro/quick-templates", Sparkles,    "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),
  e("whatsapp-throttle",       "Anti-spam & Throttling",     "/dashboard/whatsapp-pro/throttle",        Gauge,       "comunicacao", { moduleSlug: "whatsapp-business", visibleInSidebar: false }),

  // Itens administrativos / executivos (movidos para grupos próprios)
 e("exec-command","Dashboard Executivo","/dashboard/communication/executive", BarChart3, "ai-strategy"),
 e("plan-mgmt",   "Plan Management","/admin/plan-management",                Crown,     "administracao"),
 e("workspace-plan","Plano Atual",  "/dashboard/settings/workspace-plan",   CreditCard,"administracao"),
 e("onboarding-projects","Onboarding","/dashboard/onboarding",               Briefcase, "operacoes"),
 e("delivery-projects","Implementação","/dashboard/delivery/projects",       Rocket,    "operacoes"),
 e("customer-success","Customer Success","/dashboard/customer-success",        Heart,     "operacoes"),

  // ══════════════════════════════════════════════════════════════
  // PERFORMANCE & GAMIFICAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("perf-dashboard",  "Dashboard",        "/dashboard/performance",              BarChart3,   "performance"),
  e("perf-metrics",    "Métricas & Metas", "/dashboard/performance/metrics",      BarChart3,   "performance"),
  e("perf-leaderboard","Leaderboard",      "/dashboard/performance/leaderboard",  Trophy,      "performance"),
  e("perf-challenges", "Desafios",         "/dashboard/performance/challenges",   Flame,       "performance"),
  e("perf-recognition","Reconhecimentos",  "/dashboard/performance/recognition",  Star,        "performance"),
  e("perf-tv-mode",    "TV Mode",          "/dashboard/performance/tv-mode",      Tv,          "performance"),
  e("perf-settings",   "Configurações",    "/dashboard/performance/settings",     Settings,    "performance"),

  // ══════════════════════════════════════════════════════════════
  // MARKETING
  // ══════════════════════════════════════════════════════════════
  e("email-campaigns", "Campanhas Email",  "/dashboard/email-campaigns",  Mail,      "marketing", { moduleSlug: "email-campaigns", menuKey: "marketing" }),
  e("marketing-hub",   "Marketing",        "/dashboard/marketing",        Megaphone, "marketing", { visibleInSidebar: false }),
  e("conversion-hub",  "Funis & Landing Pages", "/dashboard/conversion", Workflow, "marketing"),
  e("builder",         "HTML Builder",     "/dashboard/builder",          Wand2,     "marketing"),
  e("funnels",         "Funis",            "/dashboard/funnels",          Workflow,  "marketing"),
  e("landing-pages",   "Landing Pages",    "/dashboard/landing-pages",    Globe,     "marketing"),
  e("ebooks",          "eBooks",           "/dashboard/ebooks",           BookOpen,  "marketing"),
  e("ebook-templates", "Templates eBooks", "/dashboard/ebooks/templates",  LayoutGrid, "marketing"),
  e("ebook-templates-admin", "Gerir Templates", "/dashboard/ebooks/templates/admin", LayoutGrid, "marketing"),
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
  e("pitch",        "Apresentação",     "/dashboard/pitch",             Presentation,"vendas"),
  e("invoices",     "Faturas",          "/dashboard/invoices",          Receipt,     "vendas", { moduleSlug: "invoices", menuKey: "invoices" }),
  e("collections",  "Cobranças",        "/dashboard/collections",       HandCoins,   "vendas"),
  e("collections-sequences", "Sequências de cobrança", "/dashboard/collections/sequences", HandCoins, "vendas"),
  e("collection-detail", "Detalhe de cobrança", "/dashboard/collections/:id", HandCoins, "vendas", { visibleInSidebar: false }),
  e("products",     "Produtos",         "/dashboard/products",          Package,     "vendas", { menuKey: "products" }),
  e("products-ocr", "Criar por OCR",    "/dashboard/products/ocr-create", ScanText,  "vendas", { menuKey: "products" }),
  e("products-ocr-drafts", "Rascunhos OCR", "/dashboard/products/ocr-drafts", ScanText, "vendas", { menuKey: "products" }),
  e("order-notes",  "Notas Encomenda",  "/dashboard/order-notes",       ClipboardList,"vendas"),
  e("bundles",      "Pacotes",          "/dashboard/bundles",           Layers,      "vendas"),
  e("composite-products", "Produtos Compostos", "/dashboard/composite-products", Boxes, "vendas", { menuKey: "products" }),
  e("stock-valuation", "Stock Valorizado", "/dashboard/stock-valuation", Coins, "vendas", { menuKey: "products" }),
  e("payments",     "Pagamentos",       "/dashboard/payments",          CreditCard,  "vendas"),
  e("packages",     "Pacotes",          "/dashboard/packages",          Package,     "vendas", { visibleInSidebar: false }),
  e("kpis",         "KPIs",             "/dashboard/kpis",              Gauge,       "vendas"),
  e("reports",      "Relatórios",       "/dashboard/reports",           BarChart3,   "vendas", { menuKey: "reports" }),
  e("strategy",     "Estratégia",       "/dashboard/strategy",          Brain,       "vendas"),
  e("checkout-admin","Admin Checkout",  "/dashboard/checkout-admin",    ShoppingCart, "vendas"),
  e("checkout",     "Checkout",         "/dashboard/checkout",          ShoppingCart, "vendas"),

  // ══════════════════════════════════════════════════════════════
  // LOJA ONLINE (B2C)
  // ══════════════════════════════════════════════════════════════
  e("store-orders",     "Encomendas",     "/dashboard/store-orders",     ShoppingBag,  "loja-online", { moduleSlug: "online-store" }),
  e("store-products",   "Produtos",       "/dashboard/store-products",   Package,      "loja-online", { moduleSlug: "online-store" }),
  e("store-categories", "Categorias",     "/dashboard/store-categories", Layers,       "loja-online", { moduleSlug: "online-store" }),
  e("store-coupons",    "Cupões",         "/dashboard/store-coupons",    CreditCard,   "loja-online", { moduleSlug: "online-store" }),
  e("store-reviews",    "Avaliações",     "/dashboard/store-reviews",    MessageSquare,"loja-online", { moduleSlug: "online-store" }),
  e("store-returns",   "Devoluções",     "/dashboard/store-returns",    RotateCcw,    "loja-online", { moduleSlug: "online-store" }),
  e("store-analytics",  "Analíticas",     "/dashboard/store-analytics",  BarChart3,    "loja-online", { moduleSlug: "online-store" }),
  e("store-settings",   "Definições",     "/dashboard/store-settings",   Settings,     "loja-online", { moduleSlug: "online-store" }),

  // ══════════════════════════════════════════════════════════════
  // MARKETPLACE C2C
  // ══════════════════════════════════════════════════════════════
  e("c2c",              "Marketplace C2C", "/dashboard/c2c",                  Store,         "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-seller-area", "Área Vendedor",   "/dashboard/c2c/seller-area",      UserCog,       "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-lives",       "Lives",            "/dashboard/marketplace/lives",    Video,         "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-my-listings", "Meus Anúncios",   "/dashboard/c2c/my-listings",      Package,       "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-messages",    "Mensagens",        "/dashboard/c2c/messages",         MessageSquare, "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-analytics",   "Analíticas",       "/dashboard/c2c/analytics",        BarChart3,     "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-boost",       "Boost",            "/dashboard/c2c/boost",            Rocket,        "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-sponsors",    "Sponsors",         "/dashboard/c2c/sponsors",         Award,         "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-sellers",     "Vendedores",       "/dashboard/c2c/sellers",          Users,         "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-affiliates",  "Afiliados",        "/dashboard/c2c/affiliates",       Link2,         "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-orders",      "Encomendas",       "/dashboard/c2c/orders",           ShoppingBasket,"marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-moderation",  "Moderação",        "/dashboard/c2c/moderation",       Eye,           "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
  e("c2c-config",      "Configuração",     "/dashboard/c2c/config",           Settings,      "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),

  // ══════════════════════════════════════════════════════════════
  // PORTAL B2B
  // ══════════════════════════════════════════════════════════════
  e("b2b-portal",       "Portal B2B",          "/dashboard/b2b-portal",       Building2,    "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-approvals",    "Aprovações",          "/dashboard/b2b/approvals",    CheckSquare,  "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-clients",      "Clientes",            "/dashboard/b2b/clients",      Users,        "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-users",        "Utilizadores",        "/dashboard/b2b/users",        UserCheck,    "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("b2b-plans",        "Planos",              "/dashboard/b2b/plans",        Package,      "portal-b2b", { moduleSlug: "b2b-portal" }),
  e("order-approvals",  "Aprovações Encomenda","/dashboard/order-approvals",  CheckSquare,  "portal-b2b"),
  e("client-users",     "Utilizadores Cliente","/dashboard/client-users",     Users,        "portal-b2b"),

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
  e("client-tickets-dashboard","Dashboard Tickets",    "/dashboard/tickets/dashboard",           Gauge,       "portal-b2b"),
  e("client-tickets-settings", "Config. Tickets",      "/dashboard/tickets/settings",            Settings,    "portal-b2b"),

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
  e("imports",                 "Importações",            "/dashboard/imports",                       Upload,      "operacoes"),

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
  e("procurement-price-import","Import. Preços",         "/dashboard/procurement/price-import",      Upload,      "compras", { moduleSlug: "procurement" }),
  e("procurement-supplier-import","Import. Fornecedores","/dashboard/procurement/supplier-import",   Upload,      "compras", { moduleSlug: "procurement" }),
  e("student-journey",         "Jornada do Aluno",       "/dashboard/student-journey",               Briefcase,   "operacoes", { moduleSlug: "student-journey" }),
  e("automations",             "Automações",             "/dashboard/automations",                   Zap,         "operacoes"),
  e("metodo-vision",           "Método Vision",          "/dashboard/metodo-vision",                 Target,      "operacoes", { moduleSlug: "metodo-vision" }),
  e("credit",                  "Crédito",                "/dashboard/credit",                        Landmark,    "operacoes", { moduleSlug: "credit-intermediation" }),
  e("community",               "Comunidade",             "/dashboard/community",                     Users,       "operacoes", { moduleSlug: "fastclub" }),

  // ══════════════════════════════════════════════════════════════
  // SEGURANÇA
  // ══════════════════════════════════════════════════════════════
  e("security",                "Dashboard",              "/dashboard/security",                      Shield,          "seguranca", { moduleSlug: "security-ops" }),
  e("security-partner-req",    "Pedidos Parceiros",      "/dashboard/security/partner-requests",     UserPlus,        "seguranca", { moduleSlug: "security-ops" }),
  e("security-leads",          "Leads",                  "/dashboard/security/leads",                Users,           "seguranca", { moduleSlug: "security-ops" }),
  e("security-proposals",      "Propostas",              "/dashboard/security/proposals",            FileText,        "seguranca", { moduleSlug: "security-ops" }),
  e("security-clients",        "Clientes",               "/dashboard/security/clients",              UserCheck,       "seguranca", { moduleSlug: "security-ops" }),
  e("security-sites",          "Locais",                 "/dashboard/security/sites",                MapPin,          "seguranca", { moduleSlug: "security-ops" }),
  e("security-systems",        "Sistemas",               "/dashboard/security/systems",              Cpu,             "seguranca", { moduleSlug: "security-ops" }),
  e("security-equipment",      "Equipamentos",           "/dashboard/security/equipment",            Wrench,          "seguranca", { moduleSlug: "security-ops" }),
  e("security-contracts",      "Contratos",              "/dashboard/security/contracts",            FileCheck,       "seguranca", { moduleSlug: "security-ops" }),
  e("security-documents",      "Documentos",             "/dashboard/security/documents",            FileText,        "seguranca", { moduleSlug: "security-ops" }),
  e("security-maintenance",    "Manutenção",             "/dashboard/security/maintenance",          Wrench,          "seguranca", { moduleSlug: "security-ops" }),
  e("security-occurrences",    "Ocorrências",            "/dashboard/security/occurrences",          AlertTriangle,   "seguranca", { moduleSlug: "security-ops" }),
  e("security-renewals",       "Renovações",             "/dashboard/security/renewals",             RotateCcw,       "seguranca", { moduleSlug: "security-ops" }),
  e("security-management",     "Gestão",                 "/dashboard/security/management",           BarChart3,       "seguranca", { moduleSlug: "security-ops" }),

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
  e("ai-operations",       "Operações IA",        "/dashboard/ai-operations",          Activity,       "inteligencia"),
  e("ai-settings",         "Definições IA",       "/dashboard/ai-settings",            Settings,       "inteligencia"),
  e("ai-usage",            "Utilização IA",       "/dashboard/ai-usage",               BarChart3,      "inteligencia"),
  e("imo-ai",              "IMO AI",               "/dashboard/imo-ai",                 Home,           "inteligencia", { moduleSlug: "imo-ai" }),

  // ══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO
  // ══════════════════════════════════════════════════════════════
  e("settings-team",         "Equipa",          "/settings/team",              UsersRound,   "administracao", { menuKey: "team" }),
  e("settings-permissions",  "Permissões",      "/settings/permissions",       KeyRound,     "administracao"),
  e("settings-billing",      "Faturação",       "/settings/billing",           CreditCard,   "administracao"),
  e("credits-history",       "Histórico de Créditos", "/dashboard/credits",     Coins,        "administracao"),
  e("settings-integrations", "Integrações & API",     "/settings/integrations",      Plug,         "administracao", { menuKey: "integrations" }),
  e("settings-billing-integrations", "Programas de Faturação", "/settings/billing-integrations", Receipt, "administracao", { menuKey: "integrations" }),
  e("settings-payment-gateways", "Gateways de Pagamento", "/settings/payment-gateways", CreditCard, "administracao", { menuKey: "billing" }),
  e("settings-workspace",    "Workspace",       "/settings/workspace",         FolderCog,    "administracao"),
  e("settings-roles",        "Papéis",          "/settings/roles",             ShieldCheck,  "administracao"),
  e("marketplace",           "Marketplace",     "/dashboard/marketplace",      Puzzle,       "administracao"),
  e("diagnostics",           "Diagnósticos",    "/dashboard/diagnostics",      Stethoscope,  "administracao", { status: "hidden", visibleInSidebar: false, visibleInSearch: false }),
  e("system-health",         "Saúde do Sistema","/dashboard/system/health",    HeartPulse,   "administracao"),
  e("super-admin",           "Super Admin",     "/super-admin",                Shield,       "administracao"),
  e("kernel-admin",          "FastCRM Kernel",  "/admin/kernel",               Cpu,          "administracao"),
  e("product-audit",         "Product Audit",   "/admin/product-audit",        Stethoscope,  "administracao"),
  // Search-only admin routes
  e("settings-main",  "Definições",    "/settings",                Settings,       "administracao", { visibleInSidebar: false, menuKey: "settings" }),
  e("profile",        "Perfil",        "/dashboard/profile",       UserCheck,      "administracao", { visibleInSidebar: false }),
  e("member-panel",   "Painel Membro", "/dashboard/member",        Users,          "administracao", { visibleInSidebar: false }),
  e("notifications",  "Notificações",  "/dashboard/notifications", Bell,           "administracao", { visibleInSidebar: false }),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { type AppMode, LEADCHEF_MODE_WHITELIST } from "@/config/appModes";

/** Aplica filtro de modo (LeadChef-only mostra só whitelist) */
function passesModeFilter(r: RouteEntry, mode: AppMode): boolean {
  if (mode !== "leadchef") return true;
  return LEADCHEF_MODE_WHITELIST.keys.has(r.key);
}

/** Get sidebar-visible entries for a specific group, filtered by installed modules & permissions */
export function getSidebarItems(
  group: NavGroup,
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean,
  mode: AppMode = "fastcrm"): RouteEntry[] {
  const installed = new Set(installedModuleSlugs);
  return ROUTE_MANIFEST.filter((r) => {
    if (r.group !== group) return false;
    if (!r.visibleInSidebar) return false;
    if (r.status !== "active") return false;
    if (!passesModeFilter(r, mode)) return false;
    if (r.moduleSlug && !installed.has(r.moduleSlug)) return false;
    if (r.menuKey && !canAccess(r.menuKey)) return false;
    if (!canAccess(r.key)) return false;
    return true;
  });
}

/** Get all searchable routes (for GlobalSearch / command palette) */
export function getSearchableRoutes(
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean,
  mode: AppMode = "fastcrm"): RouteEntry[] {
  const installed = new Set(installedModuleSlugs);
  return ROUTE_MANIFEST.filter((r) => {
    if (!r.visibleInSearch) return false;
    if (r.status !== "active") return false;
    if (!passesModeFilter(r, mode)) return false;
    if (r.moduleSlug && !installed.has(r.moduleSlug)) return false;
    if (r.menuKey && !canAccess(r.menuKey)) return false;
    if (!canAccess(r.key)) return false;
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
  mode: AppMode = "fastcrm"): Array<NavGroupMeta & { items: RouteEntry[] }> {
  return NAV_GROUPS
    .map((g) => ({
      ...g,
      items: getSidebarItems(g.key, installedModuleSlugs, canAccess, mode),
    }))
    .filter((g) => g.items.length > 0);
}

// ─── Mega-Group Mapping ─────────────────────────────────────────────────────
// Maps fine-grained NavGroups into 4 high-level mega-groups for the App Shell.
// Fase 2: consolidação 6 → 4 (Início+IA dentro de Core; Marketing junto a Vendas;
// RH/Suporte/Lojas/Segurança/Admin agrupados em Enterprise).

export type MegaGroup = "core" | "crm" | "sales-marketing" | "enterprise";

export interface MegaGroupMeta {
  key: MegaGroup;
  label: string;
  icon: LucideIcon;
  navGroups: NavGroup[];
}

export const MEGA_GROUPS: MegaGroupMeta[] = [
  { key: "core",            label: "Core",              icon: LayoutDashboard, navGroups: ["inicio", "ai-strategy", "agenda", "comunicacao", "operacoes", "inteligencia"] },
  { key: "crm",             label: "CRM",               icon: Users,           navGroups: ["comercial", "performance"] },
  { key: "sales-marketing", label: "Vendas & Marketing",icon: TrendingUp,      navGroups: ["vendas", "compras", "marketing"] },
  { key: "enterprise",      label: "Enterprise",        icon: Building2,       navGroups: ["loja-online", "marketplace-c2c", "portal-b2b", "suporte", "rh", "seguranca", "administracao"] },
];

/** Build mega-group sidebar sections */
export function buildMegaGroupSections(
  installedModuleSlugs: string[],
  canAccess: (menuKey: string) => boolean): Array<MegaGroupMeta & { sections: Array<NavGroupMeta & { items: RouteEntry[] }> }> {
  const allSections = buildSidebarSections(installedModuleSlugs, canAccess);
  return MEGA_GROUPS.map((mg) => ({
    ...mg,
    sections: allSections.filter((s) => mg.navGroups.includes(s.key)),
  })).filter((mg) => mg.sections.some((s) => s.items.length > 0));
}
