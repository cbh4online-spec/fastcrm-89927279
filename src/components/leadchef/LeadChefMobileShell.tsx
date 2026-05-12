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
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadChefBottomNav } from "./LeadChefBottomNav";
import { LeadChefFloatingActionButton } from "./LeadChefFloatingActionButton";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showFab?: boolean;
}

const desktopNav = [
  { to: "/dashboard/leadchef/today", label: "Hoje", icon: Home },
  { to: "/dashboard/leadchef/leads", label: "Leads", icon: UserRoundSearch },
  { to: "/dashboard/leadchef/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/dashboard/leadchef/clientes", label: "Clientes", icon: UsersRound },
  { to: "/dashboard/leadchef/referencias", label: "Referências", icon: Sparkles },
  { to: "/dashboard/leadchef/objetivos", label: "Objetivos", icon: Target },
  { to: "/dashboard/leadchef/equipa", label: "Equipa", icon: Users },
  { to: "/dashboard/leadchef/templates", label: "Templates", icon: MessageSquare },
  { to: "/dashboard/leadchef/automacoes", label: "Automações", icon: Zap },
  { to: "/dashboard/leadchef/ferramentas", label: "Ferramentas", icon: Settings2 },
];

export function LeadChefMobileShell({ title, subtitle, children, showFab = true }: Props) {
  const navigate = useNavigate();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const role = currentWorkspace?.role;
  const canManage = isSuperAdmin || role === "owner" || role === "admin";

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/dashboard");

  const navItems = canManage
    ? [...desktopNav, { to: "/dashboard/leadchef/admin", label: "Centro", icon: Sliders }]
    : desktopNav;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur-xl bg-white/90">
        <div className="max-w-6xl mx-auto px-4 py-4 safe-area-pt">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
              <ChefHat className="h-3 w-3 mr-1" />
              LeadChef CRM
            </Badge>
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {/* Desktop nav */}
        <nav
          className="hidden md:block border-t border-slate-200 bg-white"
          aria-label="Navegação LeadChef"
        >
          <div className="max-w-6xl mx-auto px-4">
            <ul className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      end={it.to.endsWith("/today")}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                          isActive
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">{children}</main>

      {showFab && <LeadChefFloatingActionButton />}
      <LeadChefBottomNav />
    </div>
  );
}
