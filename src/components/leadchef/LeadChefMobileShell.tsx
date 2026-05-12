import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChefHat,
  ArrowLeft,
  Home,
  UserRoundSearch,
  CalendarDays,
  UsersRound,
  Sparkles,
  Target,
  Users,
  MessageSquare,
  Zap,
  Settings2,
  Sliders,
  Package,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadChefBottomNav } from "./LeadChefBottomNav";
import { LeadChefFloatingActionButton } from "./LeadChefFloatingActionButton";
import { L } from "@/config/leadchef/labels";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showFab?: boolean;
}

const desktopNav = [
  { to: "/dashboard/leadchef/today", label: "Hoje", icon: Home },
  { to: "/dashboard/leadchef/leads", label: L.Plural, icon: UserRoundSearch },
  { to: "/dashboard/leadchef/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/dashboard/leadchef/clientes", label: "Clientes", icon: UsersRound },
  { to: "/dashboard/leadchef/referencias", label: "Referências", icon: Sparkles },
  { to: "/dashboard/leadchef/objetivos", label: "Objetivos", icon: Target },
  { to: "/dashboard/leadchef/equipa", label: "Equipa", icon: Users },
  { to: "/dashboard/leadchef/produtos", label: "Produtos", icon: Package },
  { to: "/dashboard/leadchef/templates", label: "Templates", icon: MessageSquare },
  { to: "/dashboard/leadchef/automacoes", label: "Automações", icon: Zap },
  { to: "/dashboard/leadchef/ferramentas", label: "Ferramentas", icon: Settings2 },
];

export function LeadChefMobileShell({ title, subtitle, children, showFab = true }: Props) {
  const navigate = useNavigate();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const role = currentWorkspace?.role;
  const canManage = isSuperAdmin || role === "owner" || role === "admin";

  const goBack = () => navigate("/dashboard");

  const navItems = canManage
    ? [...desktopNav, { to: "/dashboard/leadchef/admin", label: "Centro", icon: Sliders }]
    : desktopNav;

  return (
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen"
        aria-label="Navegação LeadChef"
      >
        <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
            <ChefHat className="h-3 w-3 mr-1" />
            LeadChef
          </Badge>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.to.endsWith("/today")}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{it.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-2 border-t border-slate-200">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            Menus FastCRM
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pb-24 md:pb-8">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur-xl bg-white/90">
          <div className="max-w-6xl mx-auto px-4 py-4 safe-area-pt">
            <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
              <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                <ChefHat className="h-3 w-3 mr-1" />
                LeadChef CRM
              </Badge>
              <Button variant="outline" size="sm" className="h-8 gap-2" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Menus FastCRM
              </Button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">{children}</main>
      </div>

      {showFab && <LeadChefFloatingActionButton />}
      <LeadChefBottomNav />
    </div>
  );
}
