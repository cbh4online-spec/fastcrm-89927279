import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  Target,
  CheckSquare,
  Calendar,
  Megaphone,
  Zap,
  Brain,
  FileText,
  Settings,
  Sparkles,
  Inbox,
  BarChart3,
  Layers,
  GitBranch,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavV1Item {
  name: string;
  href: string;
  icon: LucideIcon;
  group: string;
  end?: boolean;
  separator?: boolean; // show a thin line before this item
  dynamic?: boolean; // dynamically loaded from database
}

export const NAV_V1_ITEMS: NavV1Item[] = [
  // Geral
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Geral", end: true },
  { name: "Ask FastCRM", href: "/dashboard/ask", icon: Sparkles, group: "Geral" },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, group: "Geral" },

  // CRM
  { name: "Leads", href: "/dashboard/leads", icon: Users, group: "CRM", separator: true },
  { name: "Contactos", href: "/dashboard/contacts", icon: Contact, group: "CRM" },
  { name: "Empresas", href: "/dashboard/companies", icon: Building2, group: "CRM" },
  { name: "Oportunidades", href: "/dashboard/opportunities", icon: Target, group: "CRM" },
  { name: "Tarefas", href: "/dashboard/tasks", icon: CheckSquare, group: "CRM" },
  { name: "Ciclo de Vida", href: "/dashboard/lifecycle", icon: GitBranch, group: "CRM" },
  { name: "Eventos", href: "/dashboard/events", icon: Calendar, group: "CRM" },

  // Vendas
  { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText, group: "Vendas", separator: true },

  // Marketing
  { name: "Marketing", href: "/dashboard/marketing", icon: Megaphone, group: "Marketing", separator: true },

  // Ferramentas
  { name: "Automações", href: "/dashboard/automations", icon: Zap, group: "Ferramentas", separator: true },
  { name: "Assistentes IA", href: "/dashboard/ai-assistants", icon: Brain, group: "Ferramentas" },
  { name: "Form Studio", href: "/dashboard/form-studio", icon: FileText, group: "Ferramentas" },
  { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3, group: "Ferramentas" },
  { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, group: "Ferramentas" },

  // Settings
  { name: "Definições", href: "/settings", icon: Settings, group: "Definições", separator: true },
];

export function getNavV1Groups(): { group: string; items: NavV1Item[] }[] {
  const grouped = new Map<string, NavV1Item[]>();
  for (const item of NAV_V1_ITEMS) {
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group)!.push(item);
  }
  return Array.from(grouped.entries()).map(([group, items]) => ({ group, items }));
}
