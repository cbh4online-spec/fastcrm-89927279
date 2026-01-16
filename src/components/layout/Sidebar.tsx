import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
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

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  premiumFeature?: FeatureKey;
  tooltip?: string;
  highlight?: boolean;
  requiresAdmin?: boolean;
}

interface NavGroup {
  name: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  tooltip?: string;
  highlight?: boolean;
}

// Navigation structure based on operational flow
const navigationGroups: NavGroup[] = [
  {
    name: "Comando",
    icon: Brain,
    tooltip: "Centro de controlo com insights de IA",
    items: [
      { 
        name: "Dashboard", 
        href: "/dashboard", 
        icon: LayoutDashboard,
        tooltip: "Visão geral com KPIs e ações prioritárias"
      },
    ],
  },
  {
    name: "Conversas",
    icon: MessageSquare,
    tooltip: "Todas as suas comunicações num só lugar",
    items: [
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, tooltip: "Mensagens unificadas" },
      { name: "Instagram", href: "/dashboard/inbox?channel=instagram", icon: Instagram, tooltip: "DMs do Instagram" },
      { name: "WhatsApp", href: "/dashboard/inbox?channel=whatsapp", icon: Phone, tooltip: "Mensagens WhatsApp" },
      { name: "Email", href: "/dashboard/inbox?channel=email", icon: Mail, tooltip: "Emails recebidos" },
    ],
  },
  {
    name: "Leads",
    icon: Target,
    tooltip: "Gestão de potenciais clientes",
    items: [
      { name: "Todos os Leads", href: "/dashboard/leads", icon: Target, tooltip: "Ver todos os leads" },
      { name: "Novos Leads", href: "/dashboard/leads?status=new", icon: UserPlus, tooltip: "Leads ainda não contactados" },
      { name: "Qualificados", href: "/dashboard/leads?status=qualified", icon: UserCheck, tooltip: "Leads prontos para venda" },
      { name: "Prospecção Google", href: "/dashboard/leads/google-local", icon: MapPin, tooltip: "Pesquisar empresas no Google", highlight: true },
    ],
  },
  {
    name: "Vendas",
    icon: TrendingUp,
    tooltip: "Acompanhe oportunidades e feche negócios",
    highlight: true,
    items: [
      { name: "Oportunidades", href: "/dashboard/opportunities", icon: Kanban, tooltip: "Negócios em curso", highlight: true },
      { name: "Pipeline", href: "/dashboard/crm", icon: Layers, tooltip: "Vista do funil de vendas", highlight: true },
      { name: "Propostas", href: "/dashboard/proposals", icon: FileText, tooltip: "Propostas enviadas e pendentes", highlight: true },
      { name: "Produtos", href: "/dashboard/products", icon: Target, tooltip: "Catálogo de produtos e serviços" },
    ],
  },
  {
    name: "Contactos",
    icon: Users,
    tooltip: "Base de dados de pessoas e empresas",
    items: [
      { name: "Pessoas", href: "/dashboard/contacts", icon: UsersRound, tooltip: "Contactos individuais" },
      { name: "Empresas", href: "/dashboard/companies", icon: Building2, tooltip: "Organizações e empresas" },
    ],
  },
  {
    name: "Relatórios",
    icon: BarChart3,
    tooltip: "Previsões, métricas e análises de negócio",
    highlight: true,
    items: [
      { name: "Visão Geral", href: "/dashboard/reports", icon: PieChart, tooltip: "KPIs executivos" },
      { name: "KPIs Operacionais", href: "/dashboard/reports/kpis", icon: TrendingUp, tooltip: "Métricas detalhadas", highlight: true },
      { name: "Previsões", href: "/dashboard/reports/forecasts", icon: TrendingUp, tooltip: "Receita prevista" },
      { name: "Vendas", href: "/dashboard/reports/sales", icon: Target, tooltip: "Pipeline e propostas" },
      { name: "Consumo", href: "/dashboard/reports/consumption", icon: BarChart3, tooltip: "Sessões e capacidade" },
      { name: "Crescimento", href: "/dashboard/reports/growth", icon: Users, tooltip: "Top clientes e vendedores" },
      { name: "Retenção & Churn", href: "/dashboard/reports/retention", icon: Users, tooltip: "Clientes em risco" },
    ],
  },
  {
    name: "Comunicação",
    icon: MessageSquare,
    tooltip: "Templates e mensagens automatizadas",
    items: [
      { name: "Templates", href: "/dashboard/communication/templates", icon: FileCode, tooltip: "Modelos de mensagens reutilizáveis" },
    ],
  },
  {
    name: "Automações",
    icon: Zap,
    tooltip: "Automatize tarefas repetitivas",
    items: [
      { name: "Workflows", href: "/dashboard/automations", icon: Workflow, tooltip: "Regras de automação" },
      { name: "AI Insights", href: "/dashboard/ai-suggestions", icon: Brain, tooltip: "Sugestões inteligentes", premiumFeature: "ai_suggestions" },
    ],
  },
  {
    name: "IA & Conhecimento",
    icon: Brain,
    tooltip: "Bases de conhecimento e especialistas IA",
    highlight: true,
    items: [
      { name: "Perfis de IA", href: "/dashboard/ai-profiles", icon: Brain, tooltip: "Comportamento da IA por contexto", highlight: true },
      { name: "Bases de Conhecimento", href: "/dashboard/knowledge-base", icon: Brain, tooltip: "Treinar a IA com conteúdo" },
    ],
  },
  {
    name: "Financeiro",
    icon: PaymentIcon,
    tooltip: "Faturas, pagamentos e receitas",
    highlight: true,
    items: [
      { name: "Faturas", href: "/dashboard/invoices", icon: FileText, tooltip: "Gerir faturas", highlight: true },
      { name: "Pagamentos", href: "/dashboard/payments", icon: PaymentIcon, tooltip: "Histórico de pagamentos" },
      { name: "Landing Pages", href: "/dashboard/landing-pages", icon: Globe, tooltip: "Páginas de captura" },
    ],
  },
  {
    name: "Ferramentas",
    icon: FileEdit,
    tooltip: "Utilitários e integrações",
    items: [
      { name: "Form Studio", href: "/dashboard/form-studio", icon: FileEdit, tooltip: "Construtor de formulários" },
      { name: "Importações", href: "/dashboard/imports", icon: Download, tooltip: "Importar dados" },
      { name: "Integrações", href: "/dashboard/settings/integrations", icon: Link2, tooltip: "Conectar apps externos" },
      { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, tooltip: "Módulos e extensões", highlight: true },
      { name: "Gestão Módulos", href: "/dashboard/admin/marketplace", icon: Package, tooltip: "Administrar módulos", requiresAdmin: true },
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
  
  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Open groups that contain the current active route
    const initial: Record<string, boolean> = {};
    navigationGroups.forEach(group => {
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
              {navigationGroups.map(renderNavGroup)}
              
              {/* Settings Group */}
              <div className="pt-4 mt-4 border-t border-white/10">
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
            </nav>

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
