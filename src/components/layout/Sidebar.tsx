import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { PlanBadge } from "@/components/subscription/FeatureGate";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  CreditCard,
  X,
  Target,
  Kanban,
  Inbox,
  Zap,
  FileEdit,
  Globe,
  Brain,
  Crown,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Instagram,
  Mail,
  UserPlus,
  UserCheck,
  FileText,
  Workflow,
  FileCode,
  TrendingUp,
  CreditCard as PaymentIcon,
  Download,
  Link2,
  Layers,
  UsersRound,
  Phone,
  BarChart3,
  PieChart,
  Package,
  MapPin,
  Search,
  CalendarDays,
  Clock,
  Compass,
  Briefcase,
  CalendarClock,
  Newspaper,
  Sparkles,
  Hash,
  FolderOpen,
  Landmark,
  ShoppingCart,
  BookOpen,
  Store,
  UserCircle,
  Play,
  FlaskConical,
  Mic,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type FeatureKey = "ai_suggestions" | "dashboard_customization" | "automation_custom_fields";

// Menu key mapping for permissions
const menuKeyMap: Record<string, string> = {
  "Dashboard": "dashboard",
  "Mural Interno": "feed",
  "Coach IA": "productivity",
  "Inbox": "inbox",
  "Instagram": "inbox",
  "WhatsApp": "inbox",
  "Email": "inbox",
  "Templates": "inbox",
  "Leads": "leads",
  "Contactos": "contacts",
  "Empresas": "companies",
  "Oportunidades": "pipeline",
  "Pipeline": "pipeline",
  "Propostas": "proposals",
  "Faturas": "invoices",
  "Agendamento": "calendar",
  "Produtos": "products",
  "Email Marketing": "marketing",
  "Google Local": "marketing",
  "Pesquisa Web": "marketing",
  "Automações": "automations",
  "Landing Pages": "marketing",
  "Visão Geral": "reports",
  "KPIs": "reports",
  "Previsões": "reports",
  "Consumo": "reports",
  "Form Studio": "settings",
  "Importações": "settings",
  "Integrações": "integrations",
  "Perfis IA": "settings",
  "Bases Conhecimento": "settings",
  "Marketplace": "settings",
  "Campos & Módulos": "settings",
  "Pipelines": "settings",
  "Utilizadores": "team",
  "Faturação": "settings",
};

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  premiumFeature?: FeatureKey;
  tooltip?: string;
  highlight?: boolean;
  requiresAdmin?: boolean;
  moduleSlug?: string; // Required module slug for this item
}

interface NavGroup {
  name: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  tooltip?: string;
  highlight?: boolean;
  moduleSlug?: string; // Required module slug for the entire group
}

// Navigation structure - Simplified and organized
const navigationGroups: NavGroup[] = [
  // PRINCIPAL
  {
    name: "Principal",
    icon: LayoutDashboard,
    tooltip: "Área principal do sistema",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tooltip: "Visão geral com KPIs" },
      { name: "Mural Interno", href: "/dashboard/feed", icon: Newspaper, tooltip: "Comunicação interna" },
      { name: "Coach IA", href: "/dashboard/productivity", icon: Sparkles, tooltip: "Produtividade com IA", highlight: true },
    ],
  },
  // COMUNICAÇÃO
  {
    name: "Comunicação",
    icon: MessageSquare,
    tooltip: "Mensagens e conversas",
    items: [
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, tooltip: "Mensagens unificadas" },
      { name: "Instagram", href: "/dashboard/inbox?channel=instagram", icon: Instagram, tooltip: "DMs Instagram", moduleSlug: "instagram-integration" },
      { name: "WhatsApp", href: "/dashboard/inbox?channel=whatsapp", icon: Phone, tooltip: "Mensagens WhatsApp", moduleSlug: "whatsapp-business" },
      { name: "Email", href: "/dashboard/inbox?channel=email", icon: Mail, tooltip: "Emails" },
      { name: "Templates", href: "/dashboard/communication/templates", icon: FileCode, tooltip: "Modelos de mensagens" },
    ],
  },
  // CRM
  {
    name: "CRM",
    icon: Users,
    tooltip: "Gestão de relacionamentos",
    items: [
      { name: "Leads", href: "/dashboard/leads", icon: Target, tooltip: "Potenciais clientes" },
      { name: "Lead Enricher", href: "/dashboard/lead-enricher", icon: Sparkles, tooltip: "Enriquecer leads com IA", highlight: true, moduleSlug: "lead-enricher" },
      { name: "Prospecção Pro", href: "/dashboard/prospecting/professionals", icon: UserPlus, tooltip: "Descobrir profissionais (Beta)", highlight: true, moduleSlug: "prospecting-pro" },
      { name: "Contactos", href: "/dashboard/contacts", icon: UsersRound, tooltip: "Pessoas" },
      { name: "Empresas", href: "/dashboard/companies", icon: Building2, tooltip: "Organizações" },
      { name: "Oportunidades", href: "/dashboard/opportunities", icon: Kanban, tooltip: "Negócios em curso" },
      { name: "FastMatch", href: "/dashboard/fastmatch", icon: Zap, tooltip: "Rede de conexões estratégicas", highlight: true },
    ],
  },
  // VENDAS
  {
    name: "Vendas",
    icon: TrendingUp,
    tooltip: "Pipeline e propostas",
    highlight: true,
    items: [
      { name: "Pipeline", href: "/dashboard/crm", icon: Layers, tooltip: "Funil de vendas" },
      { name: "Propostas", href: "/dashboard/proposals", icon: FileText, tooltip: "Propostas comerciais" },
      { name: "Faturas", href: "/dashboard/invoices", icon: PaymentIcon, tooltip: "Gestão de faturas" },
      { name: "Agendamento", href: "/dashboard/scheduling", icon: CalendarDays, tooltip: "Calendários e reuniões" },
      { name: "Produtos", href: "/dashboard/products", icon: Package, tooltip: "Catálogo de produtos" },
    ],
  },
  // PORTAL B2B
  {
    name: "Portal B2B",
    icon: Landmark,
    tooltip: "Portal de clientes B2B",
    highlight: true,
    moduleSlug: "b2b-portal",
    items: [
      { name: "Clientes B2B", href: "/dashboard/client-users", icon: UsersRound, tooltip: "Clientes profissionais" },
      { name: "Notas de Encomenda", href: "/dashboard/order-notes", icon: ShoppingCart, tooltip: "Encomendas B2B" },
      { name: "Portal B2B", href: "/dashboard/b2b-portal", icon: Store, tooltip: "Configurar portal de clientes", highlight: true },
    ],
  },
  // LOJA ONLINE
  {
    name: "Loja Online",
    icon: Store,
    tooltip: "E-commerce e loja online",
    highlight: true,
    moduleSlug: "online-store",
    items: [
      { name: "Loja Online", href: "/dashboard/store-products", icon: ShoppingCart, tooltip: "Gerir loja e-commerce", highlight: true },
      { name: "Categorias Loja", href: "/dashboard/store-categories", icon: FolderOpen, tooltip: "Categorias de produtos" },
      { name: "Cupões", href: "/dashboard/store-coupons", icon: Layers, tooltip: "Cupões de desconto" },
      { name: "Encomendas Loja", href: "/dashboard/store-orders", icon: Package, tooltip: "Encomendas da loja online" },
      { name: "Analytics Loja", href: "/dashboard/store-analytics", icon: BarChart3, tooltip: "Métricas e desempenho da loja" },
      { name: "Config. Loja", href: "/dashboard/store-settings", icon: Store, tooltip: "Personalizar loja" },
    ],
  },
  // MARKETPLACE C2C
  {
    name: "Marketplace C2C",
    icon: Store,
    tooltip: "Compra e venda entre utilizadores",
    highlight: true,
    moduleSlug: "marketplace-c2c",
    items: [
      { name: "Marketplace", href: "/dashboard/c2c", icon: Store, tooltip: "Ver anúncios C2C", highlight: true },
      { name: "Área do Vendedor", href: "/dashboard/c2c/seller-area", icon: UserCircle, tooltip: "Gerir a tua conta de vendedor" },
      { name: "Meus Anúncios", href: "/dashboard/c2c/my-listings", icon: Package, tooltip: "Gerir os meus anúncios" },
      { name: "Mensagens C2C", href: "/dashboard/c2c/messages", icon: MessageSquare, tooltip: "Mensagens do marketplace" },
      { name: "Analytics", href: "/dashboard/c2c/analytics", icon: BarChart3, tooltip: "Dashboard do vendedor" },
      { name: "Impulsionar", href: "/dashboard/c2c/boost", icon: Zap, tooltip: "Boost e subscrições premium" },
      { name: "Sponsors", href: "/dashboard/c2c/sponsors", icon: Sparkles, tooltip: "Gerir patrocinadores" },
      { name: "Vendedores", href: "/dashboard/c2c/sellers", icon: Users, tooltip: "Gerir vendedores" },
    ],
  },
  // FASTCLUB
  {
    name: "FastClub",
    icon: Users,
    tooltip: "Comunidade, fórum e fidelidade",
    highlight: true,
    moduleSlug: "fastclub",
    items: [
      { name: "FastClub", href: "/dashboard/fastclub", icon: Zap, tooltip: "Hub da comunidade", highlight: true },
      { name: "Start Here", href: "/dashboard/fastclub/start-here", icon: Compass, tooltip: "Ponto de partida do ecossistema" },
      { name: "Método PARE", href: "/dashboard/fastclub/metodo-pare", icon: Target, tooltip: "Framework P/A/R/E" },
      { name: "FastCRM em Ação", href: "/dashboard/fastclub/demos", icon: Play, tooltip: "Demos e casos práticos" },
      { name: "Rede Privada", href: "/dashboard/fastclub/rede-privada", icon: Users, tooltip: "Hub educativo da rede" },
      { name: "Resultados", href: "/dashboard/fastclub/resultados", icon: TrendingUp, tooltip: "Prova social e métricas" },
      { name: "Anúncios Oficiais", href: "/dashboard/fastclub/anuncios", icon: Newspaper, tooltip: "Novidades e comunicados" },
      // Premium Zone
      { name: "Missão da Semana", href: "/dashboard/fastclub/missao-semana", icon: CalendarClock, tooltip: "Missão semanal premium" },
      { name: "Implementação Guiada", href: "/dashboard/fastclub/implementacao", icon: BookOpen, tooltip: "Playbooks e checklists" },
      { name: "IA Avançada", href: "/dashboard/fastclub/ia-avancada", icon: Brain, tooltip: "Templates IA e automações" },
      { name: "Laboratório Fast", href: "/dashboard/fastclub/laboratorio", icon: FlaskConical, tooltip: "Experimentos e funcionalidades beta" },
      { name: "Hot Seats", href: "/dashboard/fastclub/hot-seats", icon: Mic, tooltip: "Sessões de mentoria ao vivo" },
    ],
  },
  // MARKETING
  {
    name: "Marketing",
    icon: Compass,
    tooltip: "Prospecção e automação",
    items: [
      { name: "Email Marketing", href: "/dashboard/marketing", icon: Mail, tooltip: "Campanhas de email", highlight: true, moduleSlug: "email-campaigns" },
      { name: "Google Local", href: "/dashboard/prospecting/google-local", icon: MapPin, tooltip: "Pesquisar no Google Maps", moduleSlug: "google-local-services" },
      { name: "Pesquisa Web", href: "/dashboard/prospecting/web-search", icon: Search, tooltip: "Pesquisar na web", moduleSlug: "web-search-services" },
      { name: "Automações", href: "/dashboard/automations", icon: Zap, tooltip: "Workflows automáticos" },
      { name: "Landing Pages", href: "/dashboard/landing-pages", icon: Globe, tooltip: "Páginas de captura" },
    ],
  },
  // RELATÓRIOS
  {
    name: "Relatórios",
    icon: BarChart3,
    tooltip: "Métricas e análises",
    items: [
      { name: "Visão Geral", href: "/dashboard/reports", icon: PieChart, tooltip: "KPIs executivos" },
      { name: "KPIs", href: "/dashboard/reports/kpis", icon: TrendingUp, tooltip: "Métricas detalhadas" },
      { name: "Metas vs Resultados", href: "/dashboard/reports/goals", icon: Target, tooltip: "Comparar metas com dados reais", highlight: true },
      { name: "Previsões", href: "/dashboard/reports/forecasts", icon: TrendingUp, tooltip: "Receita prevista" },
      { name: "Consumo", href: "/dashboard/reports/consumption", icon: BarChart3, tooltip: "Sessões e capacidade" },
    ],
  },
  // FERRAMENTAS
  {
    name: "Ferramentas",
    icon: FileEdit,
    tooltip: "Utilitários do sistema",
    items: [
      { name: "SEO & Growth", href: "/dashboard/seo", icon: TrendingUp, tooltip: "Gestão de conteúdo SEO", highlight: true, moduleSlug: "seo-growth" },
      { name: "Form Studio", href: "/dashboard/form-studio", icon: FileEdit, tooltip: "Construtor de formulários" },
      { name: "Importações", href: "/dashboard/imports", icon: Download, tooltip: "Importar dados" },
      { name: "Integrações", href: "/dashboard/settings/integrations", icon: Link2, tooltip: "Conectar apps" },
      { name: "Assistentes IA", href: "/dashboard/ai-assistants", icon: Brain, tooltip: "Agentes, Personas, Bases e Fluxos", highlight: true },
      { name: "Motor Conversacional", href: "/dashboard/conversational-engine", icon: MessageSquare, tooltip: "Vibe, Regras e Objetivos" },
      { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, tooltip: "Módulos", highlight: true },
    ],
  },
  // INTERMEDIAÇÃO DE CRÉDITO (Module-gated)
  {
    name: "Crédito",
    icon: Landmark,
    tooltip: "Intermediação de crédito",
    highlight: true,
    moduleSlug: "credit-intermediation",
    items: [
      { name: "Dashboard Crédito", href: "/dashboard/credit", icon: Landmark, tooltip: "Gestão de propostas de crédito", moduleSlug: "credit-intermediation" },
    ],
  },
  // STUDENT JOURNEY (Module-gated)
  {
    name: "Student Journey",
    icon: UsersRound,
    tooltip: "Gestão do ciclo de vida do aluno",
    highlight: true,
    moduleSlug: "student-journey",
    items: [
      { name: "Painel", href: "/dashboard/student-journey", icon: LayoutDashboard, tooltip: "Dashboard educacional", moduleSlug: "student-journey" },
      { name: "Perfis", href: "/dashboard/student-journey/profiles", icon: UsersRound, tooltip: "Perfis de alunos", moduleSlug: "student-journey" },
      { name: "Cursos", href: "/dashboard/student-journey/courses", icon: FolderOpen, tooltip: "Gestão de cursos", moduleSlug: "student-journey" },
      { name: "Turmas", href: "/dashboard/student-journey/cohorts", icon: Users, tooltip: "Gestão de turmas", moduleSlug: "student-journey" },
    ],
  },
];

const settingsItems: NavItem[] = [
  { name: "Campos & Módulos", href: "/dashboard/settings/crm-data", icon: Layers, tooltip: "Personalizar campos" },
  { name: "Pipelines", href: "/dashboard/settings/pipelines", icon: Kanban, tooltip: "Configurar etapas" },
  { name: "Utilizadores", href: "/dashboard/settings/security", icon: UsersRound, tooltip: "Gerir equipa" },
  { name: "Faturação", href: "/dashboard/settings/billing", icon: CreditCard, tooltip: "Plano e pagamentos" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan, canUseFeature } = useSubscription();
  const { installedModuleIds } = useWorkspaceModules();
  const { canAccessMenu, isLoading: permissionsLoading } = useMenuPermissions();
  
  // Filter navigation based on installed modules AND permissions
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups
      .map(group => {
        // Filter items based on moduleSlug and permissions
        const filteredItems = group.items.filter(item => {
          // If item has no moduleSlug requirement, check just permissions
          if (item.moduleSlug && !installedModuleIds.includes(item.moduleSlug)) {
            return false;
          }
          
          // Check menu permissions
          const menuKey = menuKeyMap[item.name];
          if (menuKey && !permissionsLoading) {
            return canAccessMenu(menuKey);
          }
          
          return true;
        });

        // If group requires a module and it's not installed, hide entire group
        if (group.moduleSlug && !installedModuleIds.includes(group.moduleSlug)) {
          return null;
        }

        // If group has no items after filtering, hide it
        if (filteredItems.length === 0) return null;

        return { ...group, items: filteredItems };
      })
      .filter((group): group is NavGroup => group !== null);
  }, [installedModuleIds, canAccessMenu, permissionsLoading]);
  
  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Open groups that contain the current active route
    const initial: Record<string, boolean> = {};
    filteredNavigationGroups.forEach(group => {
      const isActive = group.items.some(item => {
        const basePath = item.href.split('?')[0];
        return location.pathname === basePath || location.pathname.startsWith(basePath + '/');
      });
      initial[group.name] = isActive;
    });
    return initial;
  });

  const [settingsOpen, setSettingsOpen] = useState(
    settingsItems.some(item => location.pathname.startsWith(item.href.split('?')[0]))
  );

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isActive = (href: string) => {
    const basePath = href.split('?')[0];
    if (basePath === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + '/');
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const isPremium = item.premiumFeature && !canUseFeature(item.premiumFeature);
    const active = isActive(item.href);
    
    return (
      <Tooltip key={item.name}>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
              isSubItem && "ml-3 text-[13px]",
              active
                ? "bg-primary/20 text-primary font-medium shadow-sm"
                : item.highlight
                  ? "text-white/80 hover:bg-white/5 hover:text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4 transition-colors",
              active && "text-primary"
            )} />
            <span className="flex-1">{item.name}</span>
            {isPremium && <Crown className="w-3.5 h-3.5 text-amber-400" />}
            {item.highlight && !active && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </Link>
        </TooltipTrigger>
        {item.tooltip && (
          <TooltipContent side="right" className="max-w-[200px] text-xs">
            <p>{item.tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.name] ?? false;
    const groupActive = isGroupActive(group);

    return (
      <Collapsible key={group.name} open={isOpen} onOpenChange={() => toggleGroup(group.name)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  groupActive
                    ? "bg-white/10 text-white"
                    : group.highlight
                      ? "text-white/80 hover:bg-white/5 hover:text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/90"
                )}
              >
                <group.icon className={cn(
                  "w-4 h-4",
                  groupActive && "text-primary"
                )} />
                <span className="flex-1 text-left font-medium">{group.name}</span>
                {group.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>
            </CollapsibleTrigger>
          </TooltipTrigger>
          {group.tooltip && (
            <TooltipContent side="right" className="max-w-[200px] text-xs">
              <p>{group.tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <CollapsibleContent className="space-y-0.5 mt-0.5 animate-fade-in">
          {group.name === "FastClub" ? (
            <>
              {group.items.filter(item => !["Missão da Semana", "Implementação Guiada", "IA Avançada", "Laboratório Fast", "Hot Seats"].includes(item.name)).map((item) => renderNavItem(item, true))}
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Zona Premium</span>
              </div>
              {group.items.filter(item => ["Missão da Semana", "Implementação Guiada", "IA Avançada", "Laboratório Fast", "Hot Seats"].includes(item.name)).map((item) => renderNavItem(item, true))}
            </>
          ) : (
            group.items.map((item) => renderNavItem(item, true))
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}

        {/* Sidebar - Nexus Style */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0",
            "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950",
            "border-r border-white/5",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header - Nexus Brand */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <WorkspaceLogo
                  logoUrl={currentWorkspace?.logo_url}
                  workspaceName={currentWorkspace?.name}
                  size="lg"
                  variant="sidebar"
                />
                <div>
                  <span className="font-bold text-white text-sm">FastCRM</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspace Switcher */}
            <div className="p-3 border-b border-white/5">
              <WorkspaceSwitcher />
            </div>

            {/* Plan Badge */}
            <div className="px-3 py-2 border-b border-white/5">
              <PlanBadge plan={plan} className="w-full justify-center bg-white/5 text-white/80 border-white/10 text-xs" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin"
              style={{ colorScheme: 'dark' }}
            >
            {/* Navigation Groups */}
            <div className="space-y-0.5">
              {filteredNavigationGroups.slice(0, 3).map(renderNavGroup)}
            </div>
            
            {/* Visual Separator */}
            <div className="my-2 mx-2 border-t border-white/5" />
            
            {/* More Groups */}
            <div className="space-y-0.5">
              {filteredNavigationGroups.slice(3, 5).map(renderNavGroup)}
            </div>
            
            {/* Visual Separator */}
            <div className="my-2 mx-2 border-t border-white/5" />
            
            {/* Remaining Groups */}
            <div className="space-y-0.5">
              {filteredNavigationGroups.slice(5).map(renderNavGroup)}
            </div>

            {/* Instagram Looter - Only for metodopare workspace */}
            {currentWorkspace?.slug === "metodopare" && installedModuleIds.includes("instagram-looter") && (
              <>
                <div className="my-3 mx-3 border-t border-white/10" />
                <div className="space-y-1">
                  {renderNavGroup({
                    name: "Instagram Looter",
                    icon: Instagram,
                    tooltip: "Prospecção via Instagram",
                    highlight: true,
                    moduleSlug: "instagram-looter",
                    items: [
                      { name: "Busca Global", href: "/dashboard/instagram-looter", icon: Search, tooltip: "Pesquisar utilizadores" },
                      { name: "Hashtags", href: "/dashboard/instagram-looter/hashtag", icon: Hash, tooltip: "Pesquisar por hashtag" },
                      { name: "Localização", href: "/dashboard/instagram-looter/location", icon: MapPin, tooltip: "Pesquisar por local" },
                      { name: "Explore", href: "/dashboard/instagram-looter/explore", icon: Compass, tooltip: "Feed de tendências" },
                      { name: "Coleções", href: "/dashboard/instagram-looter/collections", icon: FolderOpen, tooltip: "Perfis guardados" },
                      { name: "Leads", href: "/dashboard/instagram-looter/leads", icon: UserPlus, tooltip: "Leads gerados" },
                      { name: "Configurações", href: "/dashboard/instagram-looter/settings", icon: Settings, tooltip: "Configurações admin", requiresAdmin: true },
                    ],
                  })}
                </div>
              </>
            )}
          </nav>

          {/* Settings at Bottom - Outside scroll area */}
          <div className="mt-auto border-t border-white/5 p-2">
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        settingsOpen
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/90"
                      )}
                    >
                      <Settings className={cn("w-4 h-4", settingsOpen && "text-primary")} />
                      <span className="flex-1 text-left font-medium">Definições</span>
                      {settingsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  <p>Configurações do sistema</p>
                </TooltipContent>
              </Tooltip>
              <CollapsibleContent className="space-y-0.5 mt-0.5 animate-fade-in">
                {settingsItems.map((item) => renderNavItem(item, true))}
              </CollapsibleContent>
            </Collapsible>
          </div>

            {/* Role indicator */}
            {currentWorkspace && (
              <div className="p-2 border-t border-white/5">
                <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-white/5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">O seu cargo</p>
                  <p className="text-sm font-medium text-white/90 capitalize">
                    {currentWorkspace.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
