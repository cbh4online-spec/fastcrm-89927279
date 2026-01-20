import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
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
      { name: "Contactos", href: "/dashboard/contacts", icon: UsersRound, tooltip: "Pessoas" },
      { name: "Empresas", href: "/dashboard/companies", icon: Building2, tooltip: "Organizações" },
      { name: "Oportunidades", href: "/dashboard/opportunities", icon: Kanban, tooltip: "Negócios em curso" },
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
  // MARKETING
  {
    name: "Marketing",
    icon: Compass,
    tooltip: "Prospecção e automação",
    items: [
      { name: "Email Marketing", href: "/dashboard/marketing", icon: Mail, tooltip: "Campanhas de email", highlight: true },
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
      { name: "Form Studio", href: "/dashboard/form-studio", icon: FileEdit, tooltip: "Construtor de formulários" },
      { name: "Importações", href: "/dashboard/imports", icon: Download, tooltip: "Importar dados" },
      { name: "Integrações", href: "/dashboard/settings/integrations", icon: Link2, tooltip: "Conectar apps" },
      { name: "Perfis IA", href: "/dashboard/ai-profiles", icon: Brain, tooltip: "Comportamento da IA" },
      { name: "Bases Conhecimento", href: "/dashboard/knowledge-base", icon: Brain, tooltip: "Treinar a IA" },
      { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, tooltip: "Módulos", highlight: true },
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
    
    return (
      <Tooltip key={item.name}>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isSubItem && "ml-4 text-[13px]",
              isActive(item.href)
                ? "bg-white/20 text-white"
                : item.highlight
                  ? "text-white/90 hover:bg-white/10 hover:text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className={cn("w-4 h-4", isSubItem && "w-4 h-4")} />
            <span className="flex-1">{item.name}</span>
            {isPremium && <Crown className="w-4 h-4 text-amber-300" />}
          </Link>
        </TooltipTrigger>
        {item.tooltip && (
          <TooltipContent side="right" className="max-w-[200px]">
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
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-white/15 text-white"
                    : group.highlight
                      ? "text-white/90 hover:bg-white/10 hover:text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <group.icon className={cn("w-5 h-5", group.highlight && "text-white")} />
                <span className={cn("flex-1 text-left", group.highlight && "font-semibold")}>{group.name}</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
          </TooltipTrigger>
          {group.tooltip && (
            <TooltipContent side="right" className="max-w-[200px]">
              <p>{group.tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <CollapsibleContent className="space-y-0.5 mt-1">
          {group.items.map((item) => renderNavItem(item, true))}
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

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">FastCRM</span>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden p-1 rounded-md hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspace Switcher */}
            <div className="p-4 border-b border-white/10">
              <WorkspaceSwitcher />
            </div>

            {/* Plan Badge */}
            <div className="px-4 py-2 border-b border-white/10">
              <PlanBadge plan={plan} className="w-full justify-center bg-white/10 text-white border-white/20" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto"
              style={{ colorScheme: 'dark' }}
            >
            {/* Navigation Groups */}
            <div className="space-y-1">
              {filteredNavigationGroups.slice(0, 3).map(renderNavGroup)}
            </div>
            
            {/* Visual Separator */}
            <div className="my-3 mx-3 border-t border-white/10" />
            
            {/* More Groups */}
            <div className="space-y-1">
              {filteredNavigationGroups.slice(3, 5).map(renderNavGroup)}
            </div>
            
            {/* Visual Separator */}
            <div className="my-3 mx-3 border-t border-white/10" />
            
            {/* Remaining Groups */}
            <div className="space-y-1">
              {filteredNavigationGroups.slice(5).map(renderNavGroup)}
            </div>
          </nav>

          {/* Settings at Bottom - Outside scroll area */}
          <div className="mt-auto border-t border-white/10 p-3">
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        settingsOpen
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="flex-1 text-left">Definições</span>
                      {settingsOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p>Configurações do sistema</p>
                </TooltipContent>
              </Tooltip>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {settingsItems.map((item) => renderNavItem(item, true))}
              </CollapsibleContent>
            </Collapsible>
          </div>

            {/* Role indicator */}
            {currentWorkspace && (
              <div className="p-4 border-t border-white/10">
                <div className="px-3 py-2 rounded-lg bg-white/10">
                  <p className="text-xs text-white/60">O seu cargo</p>
                  <p className="text-sm font-medium text-white capitalize">
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
