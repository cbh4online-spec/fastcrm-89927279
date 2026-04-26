import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Briefcase,
  GitBranch,
  CheckSquare,
  Calendar,
  Bot,
  FileBarChart,
  BrainCircuit,
  Plug,
  Settings2,
  ChevronLeft,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/app-v2/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Comercial",
    items: [
      { to: "/app-v2/contactos", label: "Contactos", icon: Users },
      { to: "/app-v2/leads", label: "Leads", icon: Sparkles, badge: "12" },
      { to: "/app-v2/oportunidades", label: "Oportunidades", icon: Briefcase },
      { to: "/app-v2/funis", label: "Funis", icon: GitBranch },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/app-v2/tarefas", label: "Tarefas", icon: CheckSquare, badge: "5" },
      { to: "/app-v2/calendario", label: "Calendário", icon: Calendar },
      { to: "/app-v2/automacoes", label: "Automações", icon: Bot },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/app-v2/relatorios", label: "Relatórios", icon: FileBarChart },
      { to: "/app-v2/insights", label: "IA & Insights", icon: BrainCircuit },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/app-v2/integracoes", label: "Integrações", icon: Plug },
      { to: "/app-v2/definicoes", label: "Definições", icon: Settings2 },
    ],
  },
];

export function SidebarV2({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-navy-100 bg-white transition-[width] duration-300",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Brand */}
      <div className={cn("flex h-16 items-center border-b border-navy-100 px-4", collapsed && "justify-center px-2")}>
        <Link to="/app-v2/dashboard" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-cyan text-white shadow-[0_8px_24px_-8px_hsl(218_100%_54%/0.6)]">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap font-display text-lg font-semibold tracking-tight text-navy"
              >
                FastCRM
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end>
                    {({ isActive }) => (
                      <SidebarRow item={item} active={isActive} collapsed={collapsed} />
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-navy-100 p-3", collapsed ? "flex justify-center" : "")}>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-100 text-navy-500 transition-all hover:border-brand/40 hover:text-brand"
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>

        {!collapsed && (
          <div className="ml-3 flex flex-1 items-center justify-between rounded-lg px-2">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-cyan text-xs font-semibold text-white">
                JR
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-navy">João R.</p>
                <p className="text-[10px] text-navy-300">Administrador</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-brand-ice hover:text-navy"
              aria-label="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-brand/8 text-brand"
          : "text-navy-500 hover:bg-brand-ice hover:text-navy",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
          active ? "text-brand" : "",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                active ? "bg-brand text-white" : "bg-navy-100 text-navy-500 group-hover:bg-white",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function TopbarV2({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  const [query, setQuery] = useState("");
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-navy-100 bg-white/85 px-6 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight text-navy">
          {title}
        </h1>
        {subtitle && <p className="truncate text-xs text-navy-300">{subtitle}</p>}
      </div>

      {/* Global search */}
      <div className="relative hidden md:block">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar contactos, leads, negócios…"
          className="h-10 w-[340px] rounded-xl border border-navy-100 bg-brand-ice/60 pl-10 pr-16 text-sm text-navy placeholder:text-navy-300 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <kbd className="pointer-events-none absolute right-3 top-1/2 inline-flex h-5 -translate-y-1/2 items-center rounded border border-navy-100 bg-white px-1.5 text-[10px] font-medium text-navy-300">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1.5">
        <TopbarIconButton ariaLabel="Notificações" badge>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </TopbarIconButton>
        <TopbarIconButton ariaLabel="Ajuda">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
          </svg>
        </TopbarIconButton>
        <button
          type="button"
          className="ml-2 inline-flex items-center gap-2 rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_hsl(218_70%_14%/0.4)] transition-all hover:-translate-y-0.5 hover:bg-navy-900"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Nova ação
        </button>
      </div>
    </header>
  );
}

function TopbarIconButton({
  children,
  ariaLabel,
  badge,
}: {
  children: ReactNode;
  ariaLabel: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-500 transition-all hover:bg-brand-ice hover:text-navy"
    >
      {children}
      {badge && (
        <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-destructive ring-2 ring-white" />
      )}
    </button>
  );
}

export function AppShellV2({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-brand-ice">
      <SidebarV2 collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopbarV2 title={title} subtitle={subtitle} />
        <main className="flex-1 px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
