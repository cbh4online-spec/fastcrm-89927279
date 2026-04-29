import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Inbox, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
}

const TABS: Tab[] = [
  {
    to: "/dashboard",
    label: "Início",
    icon: Home,
    match: (p) => p === "/dashboard" || p === "/dashboard/",
  },
  {
    to: "/dashboard/pipeline",
    label: "Vendas",
    icon: BarChart3,
    match: (p) => p.startsWith("/dashboard/pipeline") || p.startsWith("/dashboard/deals") || p.startsWith("/dashboard/proposals") || p.startsWith("/dashboard/opportunities"),
  },
  {
    to: "/dashboard/contacts",
    label: "Contactos",
    icon: Users,
    match: (p) => p.startsWith("/dashboard/contacts") || p.startsWith("/dashboard/leads") || p.startsWith("/dashboard/clients"),
  },
  {
    to: "/dashboard/inbox",
    label: "Inbox",
    icon: Inbox,
    match: (p) => p.startsWith("/dashboard/inbox") || p.startsWith("/dashboard/whatsapp") || p.startsWith("/dashboard/sms"),
  },
];

/**
 * Native-app-style bottom navigation (mobile only).
 * 4 fixed primary tabs + a "Mais" button that opens the full drawer
 * (the existing AdaptiveSidebar) for everything else.
 *
 * Hidden on tablet/desktop (≥ md breakpoint).
 */
export const MobileBottomNav = React.forwardRef<HTMLElement, MobileBottomNavProps>(function MobileBottomNav(
  { onMenuClick },
  _ref,
) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "bg-background/95 backdrop-blur-xl border-t border-border",
        "safe-area-pb mobile-tap-highlight-none"
      )}
    >
      <ul className="grid grid-cols-5 h-16">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match
            ? tab.match(location.pathname)
            : location.pathname.startsWith(tab.to);
          return (
            <li key={tab.to} className="flex">
              <NavLink
                to={tab.to}
                onClick={() => haptics.selection()}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  "active:scale-95 transition-transform",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/10")} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li className="flex">
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onMenuClick();
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground active:scale-95 transition-transform"
            aria-label="Abrir menu completo"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
