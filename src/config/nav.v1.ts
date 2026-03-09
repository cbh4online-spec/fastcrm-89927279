import {
  LayoutDashboard,
  RotateCcw,
  Users,
  Contact,
  Building2,
  Target,
  CheckSquare,
  Calendar,
  Megaphone,
  Zap,
  Brain,
  Terminal,
  FileText,
  Settings,
  Sparkles,
  Inbox,
  BarChart3,
  Layers,
  GitBranch,
  ShoppingBag,
  Package,
  Newspaper,
  Phone,
  Mail,
  Store,
  ShoppingCart,
  GraduationCap,
  Instagram,
  Globe,
  Search,
  Download,
  Plug,
  Bot,
  MessageSquare,
  Trophy,
  TrendingUp,
  Receipt,
  Presentation,
  CalendarCheck,
  Hash,
  MapPin,
  Compass,
  FolderOpen,
  Rocket,
  Eye,
  UserCheck,
  CreditCard,
  Gauge,
  TargetIcon,
  LineChart,
  PieChart,
  FileSpreadsheet,
  Ticket,
  Star,
  BookOpen,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavV1Item {
  name: string;
  href: string;
  icon: LucideIcon;
  group: string;
  end?: boolean;
  separator?: boolean;
  dynamic?: boolean;
  moduleSlug?: string;
  iconColor?: string;
}

const GROUP_COLORS: Record<string, string> = {
  "Principal": "text-violet-500",
  "Relatórios": "text-sky-500",
  "CRM": "text-emerald-500",
  "Comunicação": "text-blue-500",
  "Vendas": "text-amber-500",
  "Marketing": "text-indigo-500",
  "Compras": "text-teal-600",
  "Portal B2B": "text-orange-500",
  "Loja Online": "text-pink-500",
  "Marketplace C2C": "text-rose-500",
  "FastClub": "text-yellow-500",
  "Ferramentas": "text-slate-500",
  "Student Journey": "text-teal-500",
  "Instagram Looter": "text-fuchsia-500",
  "Definições": "text-gray-500",
};

export const NAV_V1_ITEMS: NavV1Item[] = [
  // ── PRINCIPAL ──
  { name: "Início", href: "/dashboard", icon: Zap, group: "Principal", end: true },
  { name: "Brief Executivo", href: "/dashboard/strategy", icon: Brain, group: "Principal" },
  { name: "Command Center", href: "/command-center", icon: Zap, group: "Principal" },
  { name: "Context OS", href: "/dashboard/context-os", icon: Brain, group: "Principal" },
  { name: "Mapa de Impacto", href: "/dashboard/impact-map", icon: GitBranch, group: "Principal" },

  // ── RELATÓRIOS ──
  { name: "Visão Geral", href: "/dashboard/reports", icon: BarChart3, group: "Relatórios", separator: true },
  { name: "KPIs", href: "/dashboard/kpis", icon: Gauge, group: "Relatórios" },
  { name: "Metas vs Resultados", href: "/dashboard/reports/goals", icon: Target, group: "Relatórios" },
  { name: "Previsões", href: "/dashboard/reports/forecasts", icon: LineChart, group: "Relatórios" },
  { name: "Revenue Intelligence", href: "/dashboard/revenue", icon: TrendingUp, group: "Relatórios" },
  { name: "Consumo", href: "/dashboard/reports/consumption", icon: PieChart, group: "Relatórios" },

  // ── CRM ──
  { name: "Leads", href: "/dashboard/leads", icon: Users, group: "CRM", separator: true },
  { name: "Contactos", href: "/dashboard/contacts", icon: Contact, group: "CRM" },
  { name: "Empresas", href: "/dashboard/companies", icon: Building2, group: "CRM" },
  { name: "Pipeline", href: "/dashboard/opportunities", icon: TrendingUp, group: "CRM" },
  { name: "Ciclo de Vida", href: "/dashboard/lifecycle", icon: GitBranch, group: "CRM" },
  { name: "FastMatch", href: "/dashboard/fastmatch", icon: Star, group: "CRM" },

  // ── COMUNICAÇÃO ──
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, group: "Comunicação", separator: true },
  { name: "WhatsApp", href: "/dashboard/inbox", icon: Phone, group: "Comunicação" },
  { name: "Email", href: "/dashboard/email-campaigns", icon: Mail, group: "Comunicação", moduleSlug: "email-campaigns" },
  { name: "Mural Interno", href: "/dashboard/feed", icon: Newspaper, group: "Comunicação" },
  { name: "Templates", href: "/dashboard/communication/templates", icon: FileText, group: "Comunicação" },

  // ── VENDAS ──
  { name: "Propostas", href: "/dashboard/proposals", icon: Presentation, group: "Vendas", separator: true },
  { name: "Faturas", href: "/dashboard/invoices", icon: Receipt, group: "Vendas" },
  { name: "Produtos", href: "/dashboard/products", icon: ShoppingBag, group: "Vendas" },
  { name: "Notas de Encomenda", href: "/dashboard/order-notes", icon: FileText, group: "Vendas" },
  { name: "Pacotes & Bundles", href: "/dashboard/bundles", icon: Package, group: "Vendas" },

  // ── MARKETING ──
  { name: "Campanhas Email", href: "/dashboard/email-campaigns", icon: Mail, group: "Marketing", separator: true, moduleSlug: "email-campaigns" },
  { name: "Landing Pages", href: "/dashboard/landing-pages", icon: Globe, group: "Marketing" },
  { name: "Bio OS", href: "/dashboard/bio", icon: Globe, group: "Marketing", moduleSlug: "bio-os" },
  { name: "Prospecção", href: "/dashboard/prospecting", icon: Search, group: "Marketing" },
  { name: "Funis", href: "/dashboard/funnels", icon: GitBranch, group: "Marketing" },

  // ── COMPRAS ──
  { name: "Dashboard Compras", href: "/dashboard/procurement", icon: BarChart3, group: "Compras", separator: true, moduleSlug: "procurement" },
  { name: "Necessidades", href: "/dashboard/procurement/needs", icon: Gauge, group: "Compras", moduleSlug: "procurement" },
  { name: "Fornecedores", href: "/dashboard/procurement/suppliers", icon: Building2, group: "Compras", moduleSlug: "procurement" },
  { name: "Requisições", href: "/dashboard/procurement/requests", icon: FileText, group: "Compras", moduleSlug: "procurement" },
  { name: "Ordens de Compra", href: "/dashboard/procurement/orders", icon: ShoppingCart, group: "Compras", moduleSlug: "procurement" },
  { name: "Receção", href: "/dashboard/procurement/receipts", icon: Package, group: "Compras", moduleSlug: "procurement" },
  { name: "Faturas Fornecedor", href: "/dashboard/procurement/invoices", icon: CreditCard, group: "Compras", moduleSlug: "procurement" },
  { name: "Catálogo Fornecedores", href: "/dashboard/procurement/catalog", icon: Layers, group: "Compras", moduleSlug: "procurement" },
  { name: "Importar Preços", href: "/dashboard/procurement/price-import", icon: FileSpreadsheet, group: "Compras", moduleSlug: "procurement" },
  { name: "Projetos Compras", href: "/dashboard/procurement/projects", icon: FolderOpen, group: "Compras", moduleSlug: "procurement" },
  { name: "RFQs", href: "/dashboard/procurement/rfqs", icon: FileText, group: "Compras", moduleSlug: "procurement" },
  { name: "Dashboard RFQs", href: "/dashboard/procurement/rfqs-dashboard", icon: BarChart3, group: "Compras", moduleSlug: "procurement" },

  // ── PORTAL B2B ──
  { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText, group: "Portal B2B", separator: true, moduleSlug: "b2b-portal" },
  { name: "Aprovações", href: "/dashboard/order-approvals", icon: CheckSquare, group: "Portal B2B", moduleSlug: "b2b-portal" },
  { name: "Clientes B2B", href: "/dashboard/client-users", icon: Users, group: "Portal B2B", moduleSlug: "b2b-portal" },
  { name: "Produtos B2B", href: "/dashboard/products", icon: ShoppingBag, group: "Portal B2B", moduleSlug: "b2b-portal" },
  { name: "Stock B2B", href: "/dashboard/b2b-stock", icon: Package, group: "Portal B2B", moduleSlug: "b2b-portal" },
  { name: "Config. Portal", href: "/dashboard/b2b-portal", icon: Settings, group: "Portal B2B", moduleSlug: "b2b-portal" },

  // ── LOJA ONLINE ──
  { name: "Produtos", href: "/dashboard/store-products", icon: Store, group: "Loja Online", separator: true, moduleSlug: "online-store" },
  { name: "Encomendas", href: "/dashboard/store-orders", icon: ShoppingCart, group: "Loja Online", moduleSlug: "online-store" },
  { name: "Categorias", href: "/dashboard/store-categories", icon: FolderOpen, group: "Loja Online", moduleSlug: "online-store" },
  { name: "Cupões", href: "/dashboard/store-coupons", icon: Ticket, group: "Loja Online", moduleSlug: "online-store" },
  { name: "Analytics", href: "/dashboard/store-analytics", icon: BarChart3, group: "Loja Online", moduleSlug: "online-store" },
  { name: "Definições Loja", href: "/dashboard/store-settings", icon: Settings, group: "Loja Online", moduleSlug: "online-store" },

  // ── MARKETPLACE C2C ──
  { name: "Marketplace", href: "/dashboard/c2c", icon: ShoppingCart, group: "Marketplace C2C", separator: true, moduleSlug: "marketplace-c2c" },
  { name: "Área do Vendedor", href: "/dashboard/c2c/seller-area", icon: UserCheck, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Meus Anúncios", href: "/dashboard/c2c/my-listings", icon: Megaphone, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Mensagens C2C", href: "/dashboard/c2c/messages", icon: MessageSquare, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Analytics", href: "/dashboard/c2c/analytics", icon: BarChart3, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Impulsionar", href: "/dashboard/c2c/boost", icon: Rocket, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Sponsors", href: "/dashboard/c2c/sponsors", icon: Eye, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Vendedores", href: "/dashboard/c2c/sellers", icon: Users, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Afiliados", href: "/dashboard/c2c/affiliates", icon: TrendingUp, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Referências", href: "/dashboard/c2c/referrals", icon: Users, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },
  { name: "Admin Afiliados", href: "/dashboard/c2c/affiliate-admin", icon: Settings, group: "Marketplace C2C", moduleSlug: "marketplace-c2c" },

  // ── FASTCLUB ──
  { name: "Abrir FastClub", href: "/club/fastclub", icon: Trophy, group: "FastClub", separator: true, moduleSlug: "fastclub" },
  { name: "Candidaturas", href: "/dashboard/fastclub/candidaturas", icon: FileText, group: "FastClub", moduleSlug: "fastclub" },

  // ── FERRAMENTAS ──
  { name: "Automações", href: "/dashboard/automations", icon: Zap, group: "Ferramentas", separator: true },
  { name: "Assistentes IA", href: "/dashboard/ai-assistants", icon: Brain, group: "Ferramentas" },
  { name: "AI Employees", href: "/dashboard/ai-employees", icon: Bot, group: "Ferramentas" },
  { name: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen, group: "Ferramentas" },
  { name: "Motor Conversacional", href: "/dashboard/conversational-engine", icon: MessageSquare, group: "Ferramentas", moduleSlug: "conversational-engine" },
  { name: "Funis", href: "/dashboard/funnels", icon: GitBranch, group: "Ferramentas" },
  { name: "Form Studio", href: "/dashboard/form-studio", icon: FileText, group: "Ferramentas" },
  { name: "SEO & Growth", href: "/dashboard/seo", icon: Search, group: "Ferramentas", moduleSlug: "seo-growth" },
  { name: "Importações", href: "/dashboard/imports", icon: Download, group: "Ferramentas" },
  { name: "Integrações", href: "/settings/integrations", icon: Plug, group: "Ferramentas" },
  { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, group: "Ferramentas" },
  { name: "Configurações", href: "/settings", icon: Settings, group: "Ferramentas" },

  // ── STUDENT JOURNEY ──
  { name: "Painel", href: "/dashboard/student-journey", icon: GraduationCap, group: "Student Journey", separator: true, moduleSlug: "student-journey" },
  { name: "Perfis", href: "/dashboard/student-journey/profiles", icon: Users, group: "Student Journey", moduleSlug: "student-journey" },
  { name: "Cursos", href: "/dashboard/student-journey/courses", icon: FileText, group: "Student Journey", moduleSlug: "student-journey" },
  { name: "Turmas", href: "/dashboard/student-journey/cohorts", icon: Users, group: "Student Journey", moduleSlug: "student-journey" },

  // ── INSTAGRAM LOOTER ──
  { name: "Busca Global", href: "/dashboard/instagram-looter", icon: Instagram, group: "Instagram Looter", separator: true, moduleSlug: "instagram-looter" },
  { name: "Hashtags", href: "/dashboard/instagram-looter/hashtags", icon: Hash, group: "Instagram Looter", moduleSlug: "instagram-looter" },
  { name: "Localização", href: "/dashboard/instagram-looter/location", icon: MapPin, group: "Instagram Looter", moduleSlug: "instagram-looter" },
  { name: "Explore", href: "/dashboard/instagram-looter/explore", icon: Compass, group: "Instagram Looter", moduleSlug: "instagram-looter" },
  { name: "Coleções", href: "/dashboard/instagram-looter/collections", icon: FolderOpen, group: "Instagram Looter", moduleSlug: "instagram-looter" },
  { name: "Leads", href: "/dashboard/instagram-looter/leads", icon: Users, group: "Instagram Looter", moduleSlug: "instagram-looter" },
  { name: "Configurações", href: "/dashboard/instagram-looter/settings", icon: Settings, group: "Instagram Looter", moduleSlug: "instagram-looter" },
];

// Apply group colors to all items
NAV_V1_ITEMS.forEach((item) => {
  if (!item.iconColor) {
    item.iconColor = GROUP_COLORS[item.group] || "text-muted-foreground";
  }
});

export function getNavV1Groups(): { group: string; items: NavV1Item[] }[] {
  const grouped = new Map<string, NavV1Item[]>();
  for (const item of NAV_V1_ITEMS) {
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group)!.push(item);
  }
  return Array.from(grouped.entries()).map(([group, items]) => ({ group, items }));
}
