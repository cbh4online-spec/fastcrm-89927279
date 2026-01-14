import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Users, 
  Building2, 
  Briefcase, 
  MessageSquare, 
  FileText, 
  Zap,
  Settings,
  LayoutDashboard,
  PenTool
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  description?: string;
}

const navItems: NavItem[] = [
  { label: "CRM", icon: LayoutDashboard, href: "/dashboard/crm", description: "Pipeline e gestão" },
  { label: "Leads", icon: Target, href: "/dashboard/leads", description: "Novos contactos" },
  { label: "Oportunidades", icon: Briefcase, href: "/dashboard/opportunities", description: "Negócios ativos" },
  { label: "Inbox", icon: MessageSquare, href: "/dashboard/inbox", description: "Mensagens" },
  { label: "Propostas", icon: FileText, href: "/dashboard/proposals", description: "Orçamentos" },
  { label: "Automações", icon: Zap, href: "/dashboard/automations", description: "Workflows" },
  { label: "Contactos", icon: Users, href: "/dashboard/contacts", description: "Base de dados" },
  { label: "Empresas", icon: Building2, href: "/dashboard/companies", description: "Organizações" },
];

interface DashboardQuickNavProps {
  recentlyUsed?: string[]; // Array of hrefs
}

export function DashboardQuickNav({ recentlyUsed }: DashboardQuickNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Sort items by recently used, then keep the rest in order
  const sortedItems = [...navItems].sort((a, b) => {
    if (!recentlyUsed) return 0;
    const aIndex = recentlyUsed.indexOf(a.href);
    const bIndex = recentlyUsed.indexOf(b.href);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Show top 6 items for compact view
  const displayItems = sortedItems.slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Navegação Rápida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {displayItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.href}
                variant="outline"
                className={cn(
                  "h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-center",
                  isActive && "border-primary bg-primary/5"
                )}
                onClick={() => navigate(item.href)}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => navigate("/dashboard/form-studio")}
            >
              <PenTool className="h-3.5 w-3.5 mr-1.5" />
              Form Studio
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => navigate("/dashboard/settings")}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Definições
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
