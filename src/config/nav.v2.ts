import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Sparkles,
  BarChart3,
  Settings,
  Users,
  Building2,
  Target,
  TrendingUp,
  Presentation,
  Receipt,
  Calendar,
  Package,
  FileText,
  CheckSquare,
  Store,
  ShoppingCart,
  Tag,
  Trophy,
  Award,
  Megaphone,
  Mail,
  Globe,
  GitBranch,
  Brain,
  Zap,
  Bot,
  Search,
  Plug,
  MessageSquare,
  GraduationCap,
  BookOpen,
  UsersRound,
  Instagram,
  Hash,
  MapPin,
  Compass,
  FolderHeart,
  UserSearch,
  Cog,
  ClipboardList,
  LayoutGrid,
  Star,
  Ticket,
  Truck,
  ScanBarcode,
  FileSpreadsheet,
  FolderKanban,
  ArrowDownToLine,
  Gauge,
  LineChart,
  PieChart,
  Radio,
  Phone,
  FileX,
  Shield,
  Camera,
  Wrench,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// --- Types ---

export interface NavV2CoreItem {
  type: "item";
  nameKey: string;
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  featureFlag?: string;
  iconColor?: string;
  badgeKey?: string;
}

export interface NavV2GroupChild {
  nameKey?: string;
  name: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: string;
  moduleSlug?: string;
  iconColor?: string;
}

export interface NavV2Group {
  type: "group";
  nameKey: string;
  name: string;
  icon: LucideIcon;
  children: NavV2GroupChild[];
  featureFlag?: string;
  moduleSlug?: string;
  iconColor?: string;
}

export type NavV2Entry = NavV2CoreItem | NavV2Group;

// Translation helper type
type TNav = (key: string) => string;

// --- Core items (always visible, flat — PRINCIPAL) ---

export function getNavV2Core(t: TNav): NavV2CoreItem[] {
  return [
    { type: "item", nameKey: "home", name: t("home"), href: "/dashboard", icon: Zap, end: true, iconColor: "text-violet-500" },
    { type: "item", nameKey: "commandCenter", name: t("commandCenter"), href: "/command-center", icon: Zap, iconColor: "text-violet-500" },
    { type: "item", nameKey: "executiveBrief", name: t("executiveBrief"), href: "/dashboard/strategy", icon: Brain, iconColor: "text-violet-500" },
    { type: "item", nameKey: "aiCeoCopilot", name: t("aiCeoCopilot"), href: "/dashboard/ceo-copilot", icon: Sparkles, iconColor: "text-violet-500" },
    { type: "item", nameKey: "contextOs", name: t("contextOs"), href: "/dashboard/context-os", icon: Brain, iconColor: "text-violet-500" },
    { type: "item", nameKey: "impactMap", name: t("impactMap"), href: "/dashboard/impact-map", icon: GitBranch, iconColor: "text-violet-500" },
    { type: "item", nameKey: "revenueFlightControl", name: t("revenueFlightControl"), href: "/dashboard/revenue-flight-control", icon: Gauge, iconColor: "text-amber-500" },
  ];
}

// --- Collapsible groups ---

export function getNavV2Groups(t: TNav): NavV2Group[] {
  return [
    {
      type: "group",
      nameKey: "groupReports",
      name: t("groupReports"),
      icon: BarChart3,
      iconColor: "text-sky-500",
      children: [
        { nameKey: "reportsOverview", name: t("reportsOverview"), href: "/dashboard/reports", icon: BarChart3, iconColor: "text-sky-500" },
        { nameKey: "reportsKpis", name: t("reportsKpis"), href: "/dashboard/kpis", icon: Gauge, iconColor: "text-sky-500" },
        { nameKey: "reportsGoalsResults", name: t("reportsGoalsResults"), href: "/dashboard/reports/goals", icon: Target, iconColor: "text-sky-500" },
        { nameKey: "reportsForecasts", name: t("reportsForecasts"), href: "/dashboard/reports/forecasts", icon: LineChart, iconColor: "text-sky-500" },
        { nameKey: "reportsConsumption", name: t("reportsConsumption"), href: "/dashboard/reports/consumption", icon: PieChart, iconColor: "text-sky-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupCrm",
      name: t("groupCrm"),
      icon: Users,
      iconColor: "text-emerald-500",
      children: [
        { nameKey: "leads", name: t("leads"), href: "/dashboard/leads", icon: UserSearch, iconColor: "text-emerald-500" },
        { nameKey: "contacts", name: t("contacts"), href: "/dashboard/contacts", icon: Users, iconColor: "text-emerald-500" },
        { nameKey: "companies", name: t("companies"), href: "/dashboard/companies", icon: Building2, iconColor: "text-emerald-500" },
        { nameKey: "pipeline", name: t("pipeline"), href: "/dashboard/opportunities", icon: TrendingUp, iconColor: "text-emerald-500" },
        { nameKey: "lifecycle", name: t("lifecycle"), href: "/dashboard/lifecycle", icon: GitBranch, iconColor: "text-emerald-500" },
        { nameKey: "fastmatch", name: t("fastmatch"), href: "/dashboard/fastmatch", icon: Star, iconColor: "text-emerald-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupCommunication",
      name: t("groupCommunication"),
      icon: Inbox,
      iconColor: "text-blue-500",
      children: [
        { nameKey: "inbox", name: t("inbox"), href: "/dashboard/inbox", icon: Inbox, iconColor: "text-blue-500" },
        { nameKey: "whatsapp", name: t("whatsapp"), href: "/dashboard/whatsapp", icon: Phone, iconColor: "text-blue-500" },
        { nameKey: "email", name: t("email"), href: "/dashboard/email-campaigns", icon: Mail, moduleSlug: "email-campaigns", iconColor: "text-blue-500" },
        { nameKey: "internalFeed", name: t("internalFeed"), href: "/dashboard/feed", icon: MessageSquare, iconColor: "text-blue-500" },
        { nameKey: "templates", name: t("templates"), href: "/dashboard/communication/templates", icon: FileText, iconColor: "text-blue-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupPerformance",
      name: t("groupPerformance"),
      icon: Trophy,
      iconColor: "text-yellow-500",
      children: [
        { nameKey: "performanceDashboard", name: t("performanceDashboard"), href: "/dashboard/performance", icon: BarChart3, iconColor: "text-yellow-500" },
        { nameKey: "performanceGoals", name: t("performanceGoals"), href: "/dashboard/performance/goals", icon: Target, iconColor: "text-yellow-500" },
        { nameKey: "leaderboard", name: t("leaderboard"), href: "/dashboard/performance/leaderboard", icon: Trophy, iconColor: "text-yellow-500" },
        { nameKey: "challenges", name: t("challenges"), href: "/dashboard/performance/challenges", icon: Zap, iconColor: "text-yellow-500" },
        { nameKey: "recognitions", name: t("recognitions"), href: "/dashboard/performance/recognition", icon: Award, iconColor: "text-yellow-500" },
        { nameKey: "tvMode", name: t("tvMode"), href: "/dashboard/performance/tv-mode", icon: Presentation, iconColor: "text-yellow-500" },
        { nameKey: "performanceSettings", name: t("performanceSettings"), href: "/dashboard/performance/settings", icon: Settings, iconColor: "text-yellow-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupSales",
      name: t("groupSales"),
      icon: TrendingUp,
      iconColor: "text-amber-500",
      children: [
        { nameKey: "proposals", name: t("proposals"), href: "/dashboard/proposals", icon: Presentation, iconColor: "text-amber-500" },
        { nameKey: "invoices", name: t("invoices"), href: "/dashboard/invoices", icon: Receipt, iconColor: "text-amber-500" },
        { nameKey: "products", name: t("products"), href: "/dashboard/products", icon: Package, iconColor: "text-amber-500" },
        { nameKey: "orderNotes", name: t("orderNotes"), href: "/dashboard/order-notes", icon: FileText, iconColor: "text-amber-500" },
        { nameKey: "packagesBundles", name: t("packagesBundles"), href: "/dashboard/bundles", icon: Package, iconColor: "text-amber-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupMarketing",
      name: t("groupMarketing"),
      icon: Megaphone,
      iconColor: "text-indigo-500",
      children: [
        { nameKey: "landingPages", name: t("landingPages"), href: "/dashboard/landing-pages", icon: Globe, iconColor: "text-indigo-500" },
        { nameKey: "bioOs", name: t("bioOs"), href: "/dashboard/bio", icon: Globe, moduleSlug: "bio-os", iconColor: "text-indigo-500" },
        { nameKey: "prospecting", name: t("prospecting"), href: "/dashboard/prospecting", icon: Search, iconColor: "text-indigo-500" },
        { nameKey: "funnels", name: t("funnels"), href: "/dashboard/funnels", icon: GitBranch, iconColor: "text-indigo-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupProcurement",
      name: t("groupProcurement"),
      icon: Truck,
      moduleSlug: "procurement",
      iconColor: "text-emerald-600",
      children: [
        { nameKey: "procurementDashboard", name: t("procurementDashboard"), href: "/dashboard/procurement", icon: LayoutDashboard, iconColor: "text-emerald-600" },
        { nameKey: "procurementNeeds", name: t("procurementNeeds"), href: "/dashboard/procurement/needs", icon: ClipboardList, iconColor: "text-emerald-600" },
        { nameKey: "procurementSuppliers", name: t("procurementSuppliers"), href: "/dashboard/procurement/suppliers", icon: Building2, iconColor: "text-emerald-600" },
        { nameKey: "procurementRequests", name: t("procurementRequests"), href: "/dashboard/procurement/requests", icon: FileText, iconColor: "text-emerald-600" },
        { nameKey: "procurementOrders", name: t("procurementOrders"), href: "/dashboard/procurement/orders", icon: ShoppingCart, iconColor: "text-emerald-600" },
        { nameKey: "procurementReceipts", name: t("procurementReceipts"), href: "/dashboard/procurement/receipts", icon: ArrowDownToLine, iconColor: "text-emerald-600" },
        { nameKey: "procurementInvoices", name: t("procurementInvoices"), href: "/dashboard/procurement/invoices", icon: Receipt, iconColor: "text-emerald-600" },
        { nameKey: "procurementCatalog", name: t("procurementCatalog"), href: "/dashboard/procurement/catalog", icon: Package, iconColor: "text-emerald-600" },
        { nameKey: "procurementPriceImport", name: t("procurementPriceImport"), href: "/dashboard/procurement/price-import", icon: FileSpreadsheet, iconColor: "text-emerald-600" },
        { nameKey: "procurementProjects", name: t("procurementProjects"), href: "/dashboard/procurement/projects", icon: FolderKanban, iconColor: "text-emerald-600" },
        { nameKey: "procurementRfqs", name: t("procurementRfqs"), href: "/dashboard/procurement/rfqs", icon: ScanBarcode, iconColor: "text-emerald-600" },
        { nameKey: "procurementRfqsDashboard", name: t("procurementRfqsDashboard"), href: "/dashboard/procurement/rfqs-dashboard", icon: BarChart3, iconColor: "text-emerald-600" },
      ],
    },
    {
      type: "group",
      nameKey: "groupB2b",
      name: t("groupB2b"),
      icon: FileText,
      moduleSlug: "b2b-portal",
      iconColor: "text-orange-500",
      children: [
        { nameKey: "b2bOrders", name: t("b2bOrders"), href: "/dashboard/b2b-orders", icon: FileText, iconColor: "text-orange-500" },
        { nameKey: "b2bApprovals", name: t("b2bApprovals"), href: "/dashboard/order-approvals", icon: CheckSquare, iconColor: "text-orange-500" },
        { nameKey: "b2bClients", name: t("b2bClients"), href: "/dashboard/b2b-clients", icon: Building2, iconColor: "text-orange-500" },
        { nameKey: "b2bProducts", name: t("b2bProducts"), href: "/dashboard/b2b-products", icon: Package, iconColor: "text-orange-500" },
        { nameKey: "b2bStock", name: t("b2bStock"), href: "/dashboard/b2b-stock", icon: ClipboardList, iconColor: "text-orange-500" },
        { nameKey: "b2bConfig", name: t("b2bConfig"), href: "/dashboard/b2b-config", icon: Cog, iconColor: "text-orange-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupOnlineStore",
      name: t("groupOnlineStore"),
      icon: Store,
      moduleSlug: "online-store",
      iconColor: "text-pink-500",
      children: [
        { nameKey: "storeProducts", name: t("storeProducts"), href: "/dashboard/store-products", icon: Package, iconColor: "text-pink-500" },
        { nameKey: "storeOrders", name: t("storeOrders"), href: "/dashboard/store-orders", icon: ShoppingCart, iconColor: "text-pink-500" },
        { nameKey: "storeCategories", name: t("storeCategories"), href: "/dashboard/store-categories", icon: Tag, iconColor: "text-pink-500" },
        { nameKey: "storeCoupons", name: t("storeCoupons"), href: "/dashboard/store-coupons", icon: Ticket, iconColor: "text-pink-500" },
        { nameKey: "storeAnalytics", name: t("storeAnalytics"), href: "/dashboard/store-analytics", icon: BarChart3, iconColor: "text-pink-500" },
        { nameKey: "storeSettings", name: t("storeSettings"), href: "/dashboard/store-settings", icon: Settings, iconColor: "text-pink-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupC2c",
      name: t("groupC2c"),
      icon: ShoppingCart,
      moduleSlug: "marketplace-c2c",
      iconColor: "text-rose-500",
      children: [
        { nameKey: "c2cMarketplace", name: t("c2cMarketplace"), href: "/dashboard/c2c", icon: LayoutGrid, iconColor: "text-rose-500" },
        { nameKey: "c2cSellerArea", name: t("c2cSellerArea"), href: "/dashboard/c2c/seller-area", icon: Store, iconColor: "text-rose-500" },
        { nameKey: "c2cMyListings", name: t("c2cMyListings"), href: "/dashboard/c2c/my-listings", icon: Tag, iconColor: "text-rose-500" },
        { nameKey: "c2cMessages", name: t("c2cMessages"), href: "/dashboard/c2c/messages", icon: MessageSquare, iconColor: "text-rose-500" },
        { nameKey: "c2cAnalytics", name: t("c2cAnalytics"), href: "/dashboard/c2c/analytics", icon: BarChart3, iconColor: "text-rose-500" },
        { nameKey: "c2cBoost", name: t("c2cBoost"), href: "/dashboard/c2c/boost", icon: Zap, iconColor: "text-rose-500" },
        { nameKey: "c2cSponsors", name: t("c2cSponsors"), href: "/dashboard/c2c/sponsors", icon: Star, iconColor: "text-rose-500" },
        { nameKey: "c2cSellers", name: t("c2cSellers"), href: "/dashboard/c2c/sellers", icon: Users, iconColor: "text-rose-500" },
        { nameKey: "c2cAffiliates", name: t("c2cAffiliates"), href: "/dashboard/c2c/affiliates", icon: TrendingUp, iconColor: "text-rose-500" },
        { nameKey: "c2cReferrals", name: t("c2cReferrals"), href: "/dashboard/c2c/referrals", icon: Users, iconColor: "text-rose-500" },
        { nameKey: "c2cAffiliateAdmin", name: t("c2cAffiliateAdmin"), href: "/dashboard/c2c/affiliate-admin", icon: Settings, iconColor: "text-rose-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupFastclub",
      name: t("groupFastclub"),
      icon: Trophy,
      moduleSlug: "fastclub",
      iconColor: "text-yellow-500",
      children: [
        { nameKey: "fastclubOpen", name: t("fastclubOpen"), href: "/club/fastclub", icon: Trophy, iconColor: "text-yellow-500" },
        { nameKey: "fastclubApplications", name: t("fastclubApplications"), href: "/dashboard/fastclub/candidaturas", icon: Award, iconColor: "text-yellow-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupTools",
      name: t("groupTools"),
      icon: Zap,
      iconColor: "text-slate-500",
      children: [
        { nameKey: "automations", name: t("automations"), href: "/dashboard/automations", icon: Zap, iconColor: "text-slate-500" },
        { nameKey: "aiAssistants", name: t("aiAssistants"), href: "/dashboard/ai-assistants", icon: Brain, iconColor: "text-slate-500" },
        { nameKey: "aiEmployees", name: t("aiEmployees"), href: "/dashboard/ai-employees", icon: Bot, iconColor: "text-slate-500" },
        { nameKey: "knowledgeBaseNav", name: t("knowledgeBaseNav"), href: "/dashboard/knowledge", icon: BookOpen, iconColor: "text-slate-500" },
        { nameKey: "integrations", name: t("integrations"), href: "/settings/integrations", icon: Plug, iconColor: "text-slate-500" },
        { nameKey: "seoGrowth", name: t("seoGrowth"), href: "/dashboard/seo", icon: Search, moduleSlug: "seo-growth", iconColor: "text-slate-500" },
        { nameKey: "conversationalEngine", name: t("conversationalEngine"), href: "/dashboard/conversational-engine", icon: MessageSquare, moduleSlug: "conversational-engine", iconColor: "text-slate-500" },
        { nameKey: "systemHealth", name: t("systemHealth"), href: "/dashboard/system/health", icon: BarChart3, iconColor: "text-slate-500" },
        { nameKey: "eventMap", name: t("eventMap"), href: "/dashboard/system/events", icon: Radio, iconColor: "text-slate-500" },
        { nameKey: "toolsSettings", name: t("toolsSettings"), href: "/settings", icon: Settings, iconColor: "text-slate-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupSecurity",
      name: t("groupSecurity"),
      icon: Shield,
      moduleSlug: "security-ops",
      iconColor: "text-red-600",
      children: [
        { nameKey: "securityDashboard", name: t("securityDashboard"), href: "/dashboard/security", icon: LayoutDashboard, iconColor: "text-red-600" },
        { nameKey: "securityPartnerRequests", name: t("securityPartnerRequests"), href: "/dashboard/security/partner-requests", icon: ClipboardList, iconColor: "text-red-600" },
        { nameKey: "securitySites", name: t("securitySites"), href: "/dashboard/security/sites", icon: Building2, iconColor: "text-red-600" },
        { nameKey: "securitySystems", name: t("securitySystems"), href: "/dashboard/security/systems", icon: Camera, iconColor: "text-red-600" },
        { nameKey: "securityEquipment", name: t("securityEquipment"), href: "/dashboard/security/equipment", icon: Camera, iconColor: "text-red-600" },
        { nameKey: "securityContracts", name: t("securityContracts"), href: "/dashboard/security/contracts", icon: FileText, iconColor: "text-red-600" },
        { nameKey: "securityDocuments", name: t("securityDocuments"), href: "/dashboard/security/documents", icon: FileText, iconColor: "text-red-600" },
        { nameKey: "securityMaintenance", name: t("securityMaintenance"), href: "/dashboard/security/maintenance", icon: Wrench, iconColor: "text-red-600" },
        { nameKey: "securityOccurrences", name: t("securityOccurrences"), href: "/dashboard/security/occurrences", icon: AlertTriangle, iconColor: "text-red-600" },
        { nameKey: "securityRenewals", name: t("securityRenewals"), href: "/dashboard/security/renewals", icon: RefreshCw, iconColor: "text-red-600" },
        { nameKey: "securityManagement", name: t("securityManagement"), href: "/dashboard/security", icon: BarChart3, iconColor: "text-red-600" },
      ],
    },
    {
      type: "group",
      nameKey: "groupStudentJourney",
      name: t("groupStudentJourney"),
      icon: GraduationCap,
      featureFlag: "student_journey",
      moduleSlug: "student-journey",
      iconColor: "text-teal-500",
      children: [
        { nameKey: "studentPanel", name: t("studentPanel"), href: "/dashboard/student-journey", icon: GraduationCap, iconColor: "text-teal-500" },
        { nameKey: "studentProfiles", name: t("studentProfiles"), href: "/dashboard/student-journey/profiles", icon: Users, iconColor: "text-teal-500" },
        { nameKey: "studentCourses", name: t("studentCourses"), href: "/dashboard/student-journey/courses", icon: BookOpen, iconColor: "text-teal-500" },
        { nameKey: "studentCohorts", name: t("studentCohorts"), href: "/dashboard/student-journey/cohorts", icon: UsersRound, iconColor: "text-teal-500" },
      ],
    },
    {
      type: "group",
      nameKey: "groupInstagramLooter",
      name: t("groupInstagramLooter"),
      icon: Instagram,
      featureFlag: "instagram_looter",
      moduleSlug: "instagram-looter",
      iconColor: "text-fuchsia-500",
      children: [
        { nameKey: "igGlobalSearch", name: t("igGlobalSearch"), href: "/dashboard/instagram-looter", icon: Search, iconColor: "text-fuchsia-500" },
        { nameKey: "igHashtags", name: t("igHashtags"), href: "/dashboard/instagram-looter/hashtags", icon: Hash, iconColor: "text-fuchsia-500" },
        { nameKey: "igLocation", name: t("igLocation"), href: "/dashboard/instagram-looter/location", icon: MapPin, iconColor: "text-fuchsia-500" },
        { nameKey: "igExplore", name: t("igExplore"), href: "/dashboard/instagram-looter/explore", icon: Compass, iconColor: "text-fuchsia-500" },
        { nameKey: "igCollections", name: t("igCollections"), href: "/dashboard/instagram-looter/collections", icon: FolderHeart, iconColor: "text-fuchsia-500" },
        { nameKey: "igLeads", name: t("igLeads"), href: "/dashboard/instagram-looter/leads", icon: UserSearch, iconColor: "text-fuchsia-500" },
        { nameKey: "igSettings", name: t("igSettings"), href: "/dashboard/instagram-looter/settings", icon: Cog, iconColor: "text-fuchsia-500" },
      ],
    },
  ];
}

// --- Footer item ---

export function getNavV2Footer(t: TNav): NavV2CoreItem {
  return {
    type: "item",
    nameKey: "settings",
    name: t("settings"),
    href: "/settings",
    icon: Settings,
    iconColor: "text-gray-500",
  };
}

// --- Static versions for backward compat (search, command palette) ---
// These use the raw keys as names — components that need translated names should use the functions above

export const NAV_V2_CORE: NavV2CoreItem[] = getNavV2Core((k) => k);
export const NAV_V2_GROUPS: NavV2Group[] = getNavV2Groups((k) => k);
export const NAV_V2_FOOTER: NavV2CoreItem = getNavV2Footer((k) => k);

export const NAV_V2_ITEMS = [
  ...NAV_V2_CORE,
  ...NAV_V2_GROUPS.flatMap((g) => g.children.map((c) => ({ ...c, type: "item" as const }))),
  NAV_V2_FOOTER,
];
