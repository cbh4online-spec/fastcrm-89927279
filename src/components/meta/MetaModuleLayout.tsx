import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Link2, Users, MessageSquare, Activity, Settings2,
} from "lucide-react";

const navItems = [
  { label: "Visão Geral", href: "/dashboard/meta", icon: LayoutDashboard, end: true },
  { label: "Ligações", href: "/dashboard/meta/connections", icon: Link2 },
  { label: "Leads", href: "/dashboard/meta/leads", icon: Users },
  { label: "Inbox", href: "/dashboard/meta/inbox", icon: MessageSquare },
  { label: "Health & Logs", href: "/dashboard/meta/health", icon: Activity },
  { label: "Mapeamento", href: "/dashboard/meta/field-mapping", icon: Settings2 },
];

export function MetaModuleLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="currentColor">
            <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 2.87 8.15 6.84 9.49.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.71.115 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A9.973 9.973 0 0022 12c0-5.5-4.46-9.96-9.96-9.96z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meta Module</h1>
          <p className="text-sm text-muted-foreground">Facebook & Instagram integrado no CRM</p>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border pb-px overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div>{children || <Outlet />}</div>
    </div>
  );
}
