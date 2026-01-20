import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Package,
  Gauge,
  Brain,
  Receipt,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Lock,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Bell,
  Database,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

// Quick access shortcuts for SaaS management
const quickActions = [
  { id: "workspaces", label: "Workspaces", icon: Building2, color: "bg-blue-500" },
  { id: "subscriptions", label: "Subscrições", icon: CreditCard, color: "bg-green-500" },
  { id: "ai-usage", label: "Uso IA", icon: Brain, color: "bg-purple-500" },
  { id: "alerts", label: "Alertas", icon: Bell, color: "bg-amber-500" },
];

const navigation: NavSection[] = [
  {
    id: "overview",
    label: "Visão Geral",
    icon: LayoutDashboard,
    items: [
      { id: "overview", label: "Overview SaaS", icon: LayoutDashboard },
    ],
  },
  {
    id: "clients",
    label: "Clientes",
    icon: Building2,
    items: [
      { id: "workspaces", label: "Workspaces", icon: Building2 },
      { id: "users", label: "Utilizadores", icon: Users },
    ],
  },
  {
    id: "product",
    label: "Produto",
    icon: Package,
    items: [
      { id: "plans", label: "Planos", icon: CreditCard },
      { id: "limits", label: "Limites & Features", icon: Gauge },
      { id: "ai-usage", label: "Uso de IA", icon: Brain },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    items: [
      { id: "subscriptions", label: "Subscrições", icon: CreditCard },
      { id: "payments", label: "Pagamentos", icon: Receipt },
      { id: "stripe-sync", label: "Stripe Sync", icon: RefreshCw },
    ],
  },
  {
    id: "control",
    label: "Controlo",
    icon: ShieldAlert,
    items: [
      { id: "alerts", label: "Alertas", icon: AlertTriangle },
      { id: "incidents", label: "Incidentes", icon: ShieldAlert },
      { id: "blocks", label: "Bloqueios", icon: Lock },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: Settings,
    items: [
      { id: "logs", label: "Logs", icon: FileText },
      { id: "permissions", label: "Permissões", icon: Lock },
      { id: "settings", label: "Configurações", icon: Settings },
    ],
  },
];

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SuperAdminSidebar({ activeSection, onSectionChange }: SuperAdminSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(["overview", "clients"]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isItemActive = (itemId: string) => activeSection === itemId;

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Gestão SaaS</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Menu */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-muted-foreground">Acesso Rápido</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant={isItemActive(action.id) ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs",
                isItemActive(action.id) && "ring-2 ring-primary/20"
              )}
              onClick={() => onSectionChange(action.id)}
            >
              <div className={cn("p-1.5 rounded-md", action.color)}>
                <action.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="truncate w-full text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {navigation.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                <section.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{section.label}</span>
                {openSections.includes(section.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pl-4 mt-1 space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                      isItemActive(item.id)
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
