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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
