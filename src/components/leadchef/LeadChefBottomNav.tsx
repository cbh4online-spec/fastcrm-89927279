import { NavLink } from "react-router-dom";
import { Home, UserRoundSearch, CalendarDays, UsersRound, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { L } from "@/config/leadchef/labels";

const items = [
  { to: "/dashboard/leadchef/today", label: "Hoje", icon: Home },
  { to: "/dashboard/leadchef/leads", label: L.Plural, icon: UserRoundSearch },
  { to: "/dashboard/leadchef/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/dashboard/leadchef/clientes", label: "Clientes", icon: UsersRound },
  { to: "/dashboard/leadchef/objetivos", label: "Objetivos", icon: Target },
];

export function LeadChefBottomNav() {
  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-40",
        "bg-background/95 backdrop-blur-xl border-t border-border",
        "pb-[env(safe-area-inset-bottom,0px)]"
      )}
      aria-label="Navegação LeadChef"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "text-emerald-600"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
