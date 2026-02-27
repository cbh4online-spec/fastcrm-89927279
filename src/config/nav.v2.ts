import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
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
} from "lucide-react";

// --- Types ---

export interface NavV2CoreItem {
  type: "item";
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  featureFlag?: string;
}

export interface NavV2GroupChild {
  name: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: string;
}

export interface NavV2Group {
  type: "group";
  name: string;
  icon: LucideIcon;
  children: NavV2GroupChild[];
  featureFlag?: string;
}

export type NavV2Entry = NavV2CoreItem | NavV2Group;

// --- Core items (always visible, flat) ---

export const NAV_V2_CORE: NavV2CoreItem[] = [
  { type: "item", name: "Home", href: "/dashboard", icon: LayoutDashboard, end: true },
  { type: "item", name: "Mural", href: "/dashboard/feed", icon: Newspaper },
  { type: "item", name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { type: "item", name: "Ask", href: "/dashboard/ask", icon: Sparkles },
  { type: "item", name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

// --- Collapsible groups ---

export const NAV_V2_GROUPS: NavV2Group[] = [
  {
    type: "group",
    name: "CRM",
    icon: Users,
    children: [
      { name: "Leads", href: "/dashboard/leads", icon: UserSearch },
      { name: "Contactos", href: "/dashboard/contacts", icon: Users },
      { name: "Empresas", href: "/dashboard/companies", icon: Building2 },
      { name: "Oportunidades", href: "/dashboard/opportunities", icon: Target },
      { name: "Objects", href: "/objects", icon: Box, featureFlag: "objects" },
    ],
  },
  {
    type: "group",
    name: "Vendas",
    icon: TrendingUp,
    children: [
      { name: "Pipeline", href: "/dashboard/revenue", icon: TrendingUp },
      { name: "Propostas", href: "/dashboard/proposals", icon: Presentation },
      { name: "Faturas", href: "/dashboard/invoices", icon: Receipt },
      { name: "Agendamento", href: "/dashboard/scheduling", icon: Calendar },
      { name: "Produtos", href: "/dashboard/products", icon: Package },
    ],
  },
  {
    type: "group",
    name: "Portal B2B",
    icon: FileText,
    children: [
      { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText },
      { name: "Aprovações", href: "/dashboard/order-approvals", icon: CheckSquare },
      { name: "Clientes B2B", href: "/dashboard/b2b-clients", icon: Building2 },
      { name: "Produtos B2B", href: "/dashboard/b2b-products", icon: Package },
      { name: "Stock", href: "/dashboard/b2b-stock", icon: ClipboardList },
      { name: "Configuração", href: "/dashboard/b2b-config", icon: Cog },
    ],
  },
  {
    type: "group",
    name: "Loja Online",
    icon: Store,
    children: [
      { name: "Produtos", href: "/dashboard/store-products", icon: Package },
      { name: "Encomendas", href: "/dashboard/store-orders", icon: ShoppingCart },
      { name: "Categorias", href: "/dashboard/store-categories", icon: Tag },
    ],
  },
  {
    type: "group",
    name: "Marketplace C2C",
    icon: ShoppingCart,
    children: [
      { name: "Marketplace", href: "/dashboard/c2c", icon: LayoutGrid },
      { name: "Área Vendedor", href: "/dashboard/c2c/seller-area", icon: Store },
      { name: "Meus Anúncios", href: "/dashboard/c2c/my-listings", icon: Tag },
      { name: "Mensagens C2C", href: "/dashboard/c2c/messages", icon: MessageSquare },
      { name: "Analytics", href: "/dashboard/c2c/analytics", icon: BarChart3 },
      { name: "Impulsionar", href: "/dashboard/c2c/boost", icon: Zap },
      { name: "Sponsors", href: "/dashboard/c2c/sponsors", icon: Star },
      { name: "Vendedores", href: "/dashboard/c2c/sellers", icon: Users },
    ],
  },
  {
    type: "group",
    name: "FastClub",
    icon: Trophy,
    children: [
      { name: "Abrir FastClub", href: "/club/fastclub", icon: Trophy },
      { name: "Candidaturas", href: "/dashboard/fastclub/candidaturas", icon: Award },
    ],
  },
  {
    type: "group",
    name: "Marketing",
    icon: Megaphone,
    children: [
      { name: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
      { name: "Email Marketing", href: "/dashboard/email-campaigns", icon: Mail },
      { name: "Google Local", href: "/dashboard/prospecting/google-local", icon: Globe },
      { name: "Funis", href: "/dashboard/funnels", icon: GitBranch },
      { name: "Bio OS", href: "/dashboard/bio", icon: Globe },
    ],
  },
  {
    type: "group",
    name: "Estratégia",
    icon: Brain,
    children: [
      { name: "Brief Executivo", href: "/dashboard/strategy", icon: Brain },
    ],
  },
  {
    type: "group",
    name: "Relatórios",
    icon: BarChart3,
    children: [
      { name: "Visão Geral", href: "/dashboard/reports", icon: BarChart3 },
      { name: "KPIs", href: "/dashboard/kpis", icon: Target },
      { name: "Metas vs Resultados", href: "/dashboard/reports/goals", icon: TrendingUp },
      { name: "Previsões", href: "/dashboard/reports/forecasts", icon: TrendingUp },
      { name: "Consumo", href: "/dashboard/reports/consumption", icon: Receipt },
    ],
  },
  {
    type: "group",
    name: "Ferramentas",
    icon: Zap,
    children: [
      { name: "Automações", href: "/dashboard/automations", icon: Zap },
      { name: "Intelligence", href: "/dashboard/intelligence", icon: Brain, featureFlag: "intelligence" },
      { name: "AI Employees", href: "/dashboard/ai-employees", icon: Bot },
      { name: "SEO & Growth", href: "/dashboard/seo", icon: Search },
      { name: "Importações", href: "/dashboard/imports", icon: Download },
      { name: "Integrações", href: "/dashboard/integrations", icon: Plug },
      { name: "Motor Conversacional", href: "/dashboard/conversational-engine", icon: MessageSquare },
      { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, featureFlag: "marketplace" },
    ],
  },
  {
    type: "group",
    name: "Student Journey",
    icon: GraduationCap,
    featureFlag: "student_journey",
    children: [
      { name: "Painel", href: "/dashboard/student-journey", icon: GraduationCap },
      { name: "Perfis", href: "/dashboard/student-journey/profiles", icon: Users },
      { name: "Cursos", href: "/dashboard/student-journey/courses", icon: BookOpen },
      { name: "Turmas", href: "/dashboard/student-journey/cohorts", icon: UsersRound },
    ],
  },
  {
    type: "group",
    name: "Instagram Looter",
    icon: Instagram,
    featureFlag: "instagram_looter",
    children: [
      { name: "Busca Global", href: "/dashboard/instagram-looter", icon: Search },
      { name: "Hashtags", href: "/dashboard/instagram-looter/hashtags", icon: Hash },
      { name: "Localização", href: "/dashboard/instagram-looter/location", icon: MapPin },
      { name: "Explore", href: "/dashboard/instagram-looter/explore", icon: Compass },
      { name: "Colecções", href: "/dashboard/instagram-looter/collections", icon: FolderHeart },
      { name: "Leads", href: "/dashboard/instagram-looter/leads", icon: UserSearch },
      { name: "Configurações", href: "/dashboard/instagram-looter/settings", icon: Cog },
    ],
  },
];

// --- Footer item ---

export const NAV_V2_FOOTER: NavV2CoreItem = {
  type: "item",
  name: "Settings",
  href: "/settings",
  icon: Settings,
};

// Backward compat — flat list of all items for search / command palette
export const NAV_V2_ITEMS = [
  ...NAV_V2_CORE,
  ...NAV_V2_GROUPS.flatMap((g) => g.children.map((c) => ({ ...c, type: "item" as const }))),
  NAV_V2_FOOTER,
];
