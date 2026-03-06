import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  RotateCcw,
  Newspaper,
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
  ShieldCheck,
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
  Download,
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
  Box,
  Layers,
  Phone,
  ClipboardList,
  LayoutGrid,
  Star,
  Ticket,
  Truck,
  ScanBarcode,
  FileSpreadsheet,
  FolderKanban,
  ArrowDownToLine,
} from "lucide-react";

// --- Types ---

export interface NavV2CoreItem {
  type: "item";
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  featureFlag?: string;
  iconColor?: string;
  badgeKey?: string;
}

export interface NavV2GroupChild {
  name: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: string;
  moduleSlug?: string;
  iconColor?: string;
}

export interface NavV2Group {
  type: "group";
  name: string;
  icon: LucideIcon;
  children: NavV2GroupChild[];
  featureFlag?: string;
  moduleSlug?: string;
  iconColor?: string;
}

export type NavV2Entry = NavV2CoreItem | NavV2Group;

// --- Core items (always visible, flat) ---

export const NAV_V2_CORE: NavV2CoreItem[] = [
  { type: "item", name: "Command Center", href: "/dashboard", icon: Zap, end: true, iconColor: "text-violet-500" },
  { type: "item", name: "Mural", href: "/dashboard/feed", icon: Newspaper, iconColor: "text-violet-500" },
  { type: "item", name: "Inbox", href: "/dashboard/inbox", icon: Inbox, iconColor: "text-blue-500", badgeKey: "inbox-unread" },
  { type: "item", name: "Ask", href: "/dashboard/ask", icon: Sparkles, iconColor: "text-violet-500" },
  { type: "item", name: "Reports", href: "/dashboard/reports", icon: BarChart3, iconColor: "text-sky-500" },
  { type: "item", name: "Leads", href: "/dashboard/leads", icon: UserSearch, iconColor: "text-emerald-500" },
  { type: "item", name: "Contactos", href: "/dashboard/contacts", icon: Users, iconColor: "text-emerald-500" },
  { type: "item", name: "Empresas", href: "/dashboard/companies", icon: Building2, iconColor: "text-emerald-500" },
  { type: "item", name: "Tarefas", href: "/dashboard/tasks", icon: CheckSquare, iconColor: "text-emerald-500" },
  { type: "item", name: "Agendamento", href: "/dashboard/scheduling", icon: Calendar, iconColor: "text-emerald-500" },
  { type: "item", name: "Produtos", href: "/dashboard/products", icon: Package, iconColor: "text-emerald-500" },
];

// --- Collapsible groups (ALL require moduleSlug — hidden when no matching module installed) ---

export const NAV_V2_GROUPS: NavV2Group[] = [
  {
    type: "group",
    name: "Vendas",
    icon: TrendingUp,
    iconColor: "text-amber-500",
    children: [
      { name: "Pipeline", href: "/dashboard/revenue", icon: TrendingUp, iconColor: "text-amber-500" },
      { name: "Oportunidades", href: "/dashboard/opportunities", icon: Target, iconColor: "text-amber-500" },
      { name: "Propostas", href: "/dashboard/proposals", icon: Presentation, iconColor: "text-amber-500" },
      { name: "Faturas", href: "/dashboard/invoices", icon: Receipt, iconColor: "text-amber-500" },
      { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText, iconColor: "text-amber-500" },
      { name: "Renovações", href: "/dashboard/renewals", icon: RotateCcw, iconColor: "text-amber-500" },
    ],
  },
  {
    type: "group",
    name: "Portal B2B",
    icon: FileText,
    moduleSlug: "b2b-portal",
    iconColor: "text-orange-500",
    children: [
      { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText, iconColor: "text-orange-500" },
      { name: "Aprovações", href: "/dashboard/order-approvals", icon: CheckSquare, iconColor: "text-orange-500" },
      { name: "Clientes B2B", href: "/dashboard/b2b-clients", icon: Building2, iconColor: "text-orange-500" },
      { name: "Produtos B2B", href: "/dashboard/b2b-products", icon: Package, iconColor: "text-orange-500" },
      { name: "Stock", href: "/dashboard/b2b-stock", icon: ClipboardList, iconColor: "text-orange-500" },
      { name: "Configuração", href: "/dashboard/b2b-config", icon: Cog, iconColor: "text-orange-500" },
    ],
  },
  {
    type: "group",
    name: "Loja Online",
    icon: Store,
    moduleSlug: "online-store",
    iconColor: "text-pink-500",
    children: [
      { name: "Produtos", href: "/dashboard/store-products", icon: Package, iconColor: "text-pink-500" },
      { name: "Encomendas", href: "/dashboard/store-orders", icon: ShoppingCart, iconColor: "text-pink-500" },
      { name: "Categorias", href: "/dashboard/store-categories", icon: Tag, iconColor: "text-pink-500" },
      { name: "Cupões", href: "/dashboard/store-coupons", icon: Ticket, iconColor: "text-pink-500" },
      { name: "Analytics", href: "/dashboard/store-analytics", icon: BarChart3, iconColor: "text-pink-500" },
      { name: "Definições", href: "/dashboard/store-settings", icon: Settings, iconColor: "text-pink-500" },
    ],
  },
  {
    type: "group",
    name: "Marketplace C2C",
    icon: ShoppingCart,
    moduleSlug: "marketplace-c2c",
    iconColor: "text-rose-500",
    children: [
      { name: "Marketplace", href: "/dashboard/c2c", icon: LayoutGrid, iconColor: "text-rose-500" },
      { name: "Área Vendedor", href: "/dashboard/c2c/seller-area", icon: Store, iconColor: "text-rose-500" },
      { name: "Meus Anúncios", href: "/dashboard/c2c/my-listings", icon: Tag, iconColor: "text-rose-500" },
      { name: "Mensagens C2C", href: "/dashboard/c2c/messages", icon: MessageSquare, iconColor: "text-rose-500" },
      { name: "Analytics", href: "/dashboard/c2c/analytics", icon: BarChart3, iconColor: "text-rose-500" },
      { name: "Impulsionar", href: "/dashboard/c2c/boost", icon: Zap, iconColor: "text-rose-500" },
      { name: "Sponsors", href: "/dashboard/c2c/sponsors", icon: Star, iconColor: "text-rose-500" },
      { name: "Vendedores", href: "/dashboard/c2c/sellers", icon: Users, iconColor: "text-rose-500" },
      { name: "Afiliados", href: "/dashboard/c2c/affiliates", icon: TrendingUp, iconColor: "text-rose-500" },
      { name: "Referências", href: "/dashboard/c2c/referrals", icon: Users, iconColor: "text-rose-500" },
      { name: "Admin Afiliados", href: "/dashboard/c2c/affiliate-admin", icon: Settings, iconColor: "text-rose-500" },
    ],
  },
  {
    type: "group",
    name: "FastClub",
    icon: Trophy,
    moduleSlug: "fastclub",
    iconColor: "text-yellow-500",
    children: [
      { name: "Abrir FastClub", href: "/club/fastclub", icon: Trophy, iconColor: "text-yellow-500" },
      { name: "Candidaturas", href: "/dashboard/fastclub/candidaturas", icon: Award, iconColor: "text-yellow-500" },
    ],
  },
  {
    type: "group",
    name: "Compras",
    icon: Truck,
    moduleSlug: "procurement",
    iconColor: "text-emerald-600",
    children: [
      { name: "Dashboard Compras", href: "/dashboard/procurement", icon: LayoutDashboard, iconColor: "text-emerald-600" },
      { name: "Necessidades", href: "/dashboard/procurement/needs", icon: ClipboardList, iconColor: "text-emerald-600" },
      { name: "Fornecedores", href: "/dashboard/procurement/suppliers", icon: Building2, iconColor: "text-emerald-600" },
      { name: "Requisições", href: "/dashboard/procurement/requests", icon: FileText, iconColor: "text-emerald-600" },
      { name: "Ordens de Compra", href: "/dashboard/procurement/orders", icon: ShoppingCart, iconColor: "text-emerald-600" },
      { name: "Receção", href: "/dashboard/procurement/receipts", icon: ArrowDownToLine, iconColor: "text-emerald-600" },
      { name: "Faturas Fornecedor", href: "/dashboard/procurement/invoices", icon: Receipt, iconColor: "text-emerald-600" },
      { name: "Catálogo", href: "/dashboard/procurement/catalog", icon: Package, iconColor: "text-emerald-600" },
      { name: "Importar Preços", href: "/dashboard/procurement/price-import", icon: FileSpreadsheet, iconColor: "text-emerald-600" },
      { name: "Projetos", href: "/dashboard/procurement/projects", icon: FolderKanban, iconColor: "text-emerald-600" },
      { name: "RFQs", href: "/dashboard/procurement/rfqs", icon: ScanBarcode, iconColor: "text-emerald-600" },
      { name: "Dashboard RFQs", href: "/dashboard/procurement/rfqs-dashboard", icon: BarChart3, iconColor: "text-emerald-600" },
    ],
  },
  {
    type: "group",
    name: "Marketing",
    icon: Megaphone,
    iconColor: "text-indigo-500",
    children: [
      { name: "Email Marketing", href: "/dashboard/email-campaigns", icon: Mail, moduleSlug: "email-campaigns", iconColor: "text-indigo-500" },
      { name: "Google Local", href: "/dashboard/prospecting/google-local", icon: Globe, moduleSlug: "google-local-services", iconColor: "text-indigo-500" },
      { name: "Bio OS", href: "/dashboard/bio", icon: Globe, moduleSlug: "bio-os", iconColor: "text-indigo-500" },
    ],
  },
  {
    type: "group",
    name: "Estratégia",
    icon: Brain,
    moduleSlug: "strategy-brief",
    iconColor: "text-cyan-500",
    children: [
      { name: "Brief Executivo", href: "/dashboard/strategy", icon: Brain, iconColor: "text-cyan-500" },
      { name: "Mapa de Impacto", href: "/dashboard/impact-map", icon: GitBranch, iconColor: "text-cyan-500" },
    ],
  },
  {
    type: "group",
    name: "Ferramentas",
    icon: Zap,
    iconColor: "text-slate-500",
    children: [
      { name: "SEO & Growth", href: "/dashboard/seo", icon: Search, moduleSlug: "seo-growth", iconColor: "text-slate-500" },
      { name: "Motor Conversacional", href: "/dashboard/conversational-engine", icon: MessageSquare, moduleSlug: "conversational-engine", iconColor: "text-slate-500" },
      { name: "System Health", href: "/dashboard/system/health", icon: ShieldCheck, iconColor: "text-slate-500" },
    ],
  },
  {
    type: "group",
    name: "Student Journey",
    icon: GraduationCap,
    featureFlag: "student_journey",
    moduleSlug: "student-journey",
    iconColor: "text-teal-500",
    children: [
      { name: "Painel", href: "/dashboard/student-journey", icon: GraduationCap, iconColor: "text-teal-500" },
      { name: "Perfis", href: "/dashboard/student-journey/profiles", icon: Users, iconColor: "text-teal-500" },
      { name: "Cursos", href: "/dashboard/student-journey/courses", icon: BookOpen, iconColor: "text-teal-500" },
      { name: "Turmas", href: "/dashboard/student-journey/cohorts", icon: UsersRound, iconColor: "text-teal-500" },
    ],
  },
  {
    type: "group",
    name: "Instagram Looter",
    icon: Instagram,
    featureFlag: "instagram_looter",
    moduleSlug: "instagram-looter",
    iconColor: "text-fuchsia-500",
    children: [
      { name: "Busca Global", href: "/dashboard/instagram-looter", icon: Search, iconColor: "text-fuchsia-500" },
      { name: "Hashtags", href: "/dashboard/instagram-looter/hashtags", icon: Hash, iconColor: "text-fuchsia-500" },
      { name: "Localização", href: "/dashboard/instagram-looter/location", icon: MapPin, iconColor: "text-fuchsia-500" },
      { name: "Explore", href: "/dashboard/instagram-looter/explore", icon: Compass, iconColor: "text-fuchsia-500" },
      { name: "Colecções", href: "/dashboard/instagram-looter/collections", icon: FolderHeart, iconColor: "text-fuchsia-500" },
      { name: "Leads", href: "/dashboard/instagram-looter/leads", icon: UserSearch, iconColor: "text-fuchsia-500" },
      { name: "Configurações", href: "/dashboard/instagram-looter/settings", icon: Cog, iconColor: "text-fuchsia-500" },
    ],
  },
];

// --- Footer item ---

export const NAV_V2_FOOTER: NavV2CoreItem = {
  type: "item",
  name: "Settings",
  href: "/settings",
  icon: Settings,
  iconColor: "text-gray-500",
};

// Backward compat — flat list of all items for search / command palette
export const NAV_V2_ITEMS = [
  ...NAV_V2_CORE,
  ...NAV_V2_GROUPS.flatMap((g) => g.children.map((c) => ({ ...c, type: "item" as const }))),
  NAV_V2_FOOTER,
];
