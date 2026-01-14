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
  HelpCircle,
  X,
  BarChart3,
  Target,
  Kanban,
  Inbox,
  Zap,
  Globe,
  Brain,
  Crown,
  LayoutList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

interface NavGroup {
  name: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const crmNavigation: NavGroup = {
  name: "CRM",
  icon: LayoutList,
  items: [
    { name: "Vista Geral", href: "/dashboard/crm", icon: LayoutList },
    { name: "Leads", href: "/dashboard/leads", icon: Target },
    { name: "Oportunidades", href: "/dashboard/opportunities", icon: Kanban },
    { name: "Contactos", href: "/dashboard/contacts", icon: Users },
    { name: "Empresas", href: "/dashboard/companies", icon: Building2 },
  ],
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
];

const afterCrmNavigation: NavItem[] = [
  { name: "Automações", href: "/dashboard/automations", icon: Zap },
  { name: "Landing Pages", href: "/dashboard/landing-pages", icon: Globe },
  { name: "AI Insights", href: "/dashboard/ai-suggestions", icon: Brain, premiumFeature: "ai_suggestions" },
  { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
];

const secondaryNavigation: NavItem[] = [
  { name: "Definições", href: "/dashboard/settings", icon: Settings },
  { name: "Faturação", href: "/dashboard/billing", icon: CreditCard },
  { name: "Ajuda", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan, canUseFeature } = useSubscription();
  
  // Check if any CRM sub-route is active
  const isCrmActive = crmNavigation.items.some(item => 
    item.href === "/dashboard/crm" 
      ? location.pathname === "/dashboard/crm"
      : location.pathname.startsWith(item.href)
  );
  
  const [crmOpen, setCrmOpen] = useState(isCrmActive);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    if (href === "/dashboard/crm") {
      return location.pathname === "/dashboard/crm";
    }
    return location.pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const isPremium = item.premiumFeature && !canUseFeature(item.premiumFeature);
    
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isSubItem && "ml-4",
          isActive(item.href)
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="w-5 h-5" />
        <span className="flex-1">{item.name}</span>
        {isPremium && <Crown className="w-4 h-4 text-amber-500" />}
      </Link>
    );
  };

  return (
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">WorkspaceOS</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="p-4 border-b border-sidebar-border">
            <WorkspaceSwitcher />
          </div>

          {/* Plan Badge */}
          <div className="px-4 py-2 border-b border-sidebar-border">
            <PlanBadge plan={plan} className="w-full justify-center" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Main navigation items */}
            {navigation.map((item) => renderNavItem(item))}
            
            {/* CRM Collapsible Group */}
            <Collapsible open={crmOpen} onOpenChange={setCrmOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                    isCrmActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <crmNavigation.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{crmNavigation.name}</span>
                  {crmOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {crmNavigation.items.map((item) => renderNavItem(item, true))}
              </CollapsibleContent>
            </Collapsible>
            
            {/* After CRM navigation items */}
            {afterCrmNavigation.map((item) => renderNavItem(item))}
          </nav>

          {/* Secondary Navigation */}
          <div className="p-4 border-t border-sidebar-border space-y-1">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Role indicator */}
          {currentWorkspace && (
            <div className="p-4 border-t border-sidebar-border">
              <div className="px-3 py-2 rounded-lg bg-sidebar-accent">
                <p className="text-xs text-sidebar-foreground/60">O seu cargo</p>
                <p className="text-sm font-medium text-sidebar-foreground capitalize">
                  {currentWorkspace.role}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}