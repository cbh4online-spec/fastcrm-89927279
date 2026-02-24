import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  Target,
  CheckSquare,
  ShoppingBag,
  Package,
  FolderOpen,
  Megaphone,
  Search,
  Zap,
  Brain,
  FileText,
  Settings,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavV1Item {
  name: string;
  href: string;
  icon: LucideIcon;
  group: string;
  end?: boolean;
}

export const NAV_V1_ITEMS: NavV1Item[] = [
  // Dashboard
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Geral", end: true },

  // CRM
  { name: "Leads", href: "/dashboard/leads", icon: Users, group: "CRM" },
  { name: "Contactos", href: "/dashboard/contacts", icon: Contact, group: "CRM" },
  { name: "Empresas", href: "/dashboard/companies", icon: Building2, group: "CRM" },
  { name: "Oportunidades", href: "/dashboard/opportunities", icon: Target, group: "CRM" },
  { name: "Tarefas", href: "/dashboard/tasks", icon: CheckSquare, group: "CRM" },

  // Loja
  { name: "Produtos", href: "/dashboard/store-products", icon: Package, group: "Loja" },
  { name: "Encomendas", href: "/dashboard/store-orders", icon: ShoppingBag, group: "Loja" },
  { name: "Categorias", href: "/dashboard/store-categories", icon: FolderOpen, group: "Loja" },

  // Marketing
  { name: "Marketing", href: "/dashboard/marketing", icon: Megaphone, group: "Marketing" },
  { name: "SEO", href: "/dashboard/seo", icon: Search, group: "Marketing" },

  // Ferramentas
  { name: "Automações", href: "/dashboard/automations", icon: Zap, group: "Ferramentas" },
  { name: "Assistentes IA", href: "/dashboard/ai-assistants", icon: Brain, group: "Ferramentas" },
  { name: "Form Studio", href: "/dashboard/form-studio", icon: FileText, group: "Ferramentas" },

  // Settings
  { name: "Definições", href: "/settings", icon: Settings, group: "Definições" },
];

export function getNavV1Groups(): { group: string; items: NavV1Item[] }[] {
  const grouped = new Map<string, NavV1Item[]>();
  for (const item of NAV_V1_ITEMS) {
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group)!.push(item);
  }
  return Array.from(grouped.entries()).map(([group, items]) => ({ group, items }));
}
