import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Users, CreditCard, Receipt, Brain,
  ShieldAlert, Bell, FileText, Settings, ShieldCheck, Search,
  ChevronDown, ChevronRight, Menu, X, ArrowLeft, Sparkles, Bug,
  Lock, Database, Package, FlaskConical, TrendingUp, Gauge, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { FastCRMLogo } from "@/components/brand/FastCRMLogo";

type NavItem = { id: string; label: string; icon: any; to: string; badge?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: "geral", label: "Geral",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, to: "/super-admin-v2" },
    ],
  },
  {
    id: "clientes", label: "Clientes",
    items: [
      { id: "workspaces", label: "Workspaces", icon: Building2, to: "/super-admin-v2/workspaces" },
      { id: "users", label: "Utilizadores", icon: Users, to: "/super-admin-v2/users" },
    ],
  },
  {
    id: "produto", label: "Produto",
    items: [
      { id: "pricing", label: "Pricing & Módulos", icon: TrendingUp, to: "/super-admin-v2/pricing" },
      { id: "limits", label: "Limites & Features", icon: Gauge, to: "/super-admin-v2/limits" },
      { id: "ai", label: "Uso de IA", icon: Brain, to: "/super-admin-v2/ai" },
    ],
  },
  {
    id: "billing", label: "Billing",
    items: [
      { id: "subs", label: "Subscrições", icon: CreditCard, to: "/super-admin-v2/subscriptions" },
      { id: "payments", label: "Pagamentos", icon: Receipt, to: "/super-admin-v2/payments" },
      { id: "stripe", label: "Stripe Sync", icon: RefreshCw, to: "/super-admin-v2/stripe" },
    ],
  },
  {
    id: "controlo", label: "Controlo",
    items: [
      { id: "alerts", label: "Alertas", icon: Bell, to: "/super-admin-v2/alerts", badge: "3" },
      { id: "incidents", label: "Incidentes", icon: ShieldAlert, to: "/super-admin-v2/incidents" },
      { id: "moderation", label: "Moderação", icon: ShieldCheck, to: "/super-admin-v2/moderation" },
      { id: "bugs", label: "Bug Reports", icon: Bug, to: "/super-admin-v2/bugs" },
    ],
  },
  {
    id: "sistema", label: "Sistema",
    items: [
      { id: "logs", label: "Logs", icon: FileText, to: "/super-admin-v2/logs" },
      { id: "activity", label: "Activity Logs", icon: Database, to: "/super-admin-v2/activity" },
      { id: "features", label: "Feature Registry", icon: Package, to: "/super-admin-v2/features" },
      { id: "rollout", label: "Rollout", icon: FlaskConical, to: "/super-admin-v2/rollout" },
      { id: "perms", label: "Permissões", icon: Lock, to: "/super-admin-v2/permissions" },
      { id: "workspace-menus", label: "Menus por Workspace", icon: Menu, to: "/super-admin-v2/workspace-menus" },
      { id: "settings", label: "Configurações", icon: Settings, to: "/super-admin-v2/settings" },
    ],
  },
];

function SidebarV2({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<string[]>(["geral", "clientes", "billing"]);
  const toggle = (id: string) =>
    setOpen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <aside className="flex h-full w-72 flex-col border-r border-navy-100 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-navy-100 px-5 py-4">
        <FastCRMLogo variant="mark" size="md" />
        <div className="min-w-0">
          <div className="font-display font-semibold tracking-tight text-navy">Super Admin</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">FastCRM · Backoffice</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {NAV.map((group) => {
          const isOpen = open.includes(group.id);
          return (
            <div key={group.id}>
              <button
                onClick={() => toggle(group.id)}
                className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300 transition-colors hover:text-navy-500"
              >
                <span>{group.label}</span>
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-1 space-y-0.5">
                      {group.items.map((item) => {
                        const active = pathname === item.to;
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.to}
                              onClick={onNavigate}
                              className={cn(
                                "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
                                active
                                  ? "bg-brand/10 text-brand"
                                  : "text-navy-500 hover:bg-brand-ice hover:text-navy"
                              )}
                            >
                              {active && (
                                <motion.span
                                  layoutId="bo-v2-active"
                                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
                                  transition={{ duration: 0.3, ease: EASE }}
                                />
                              )}
                              <item.icon
                                className={cn(
                                  "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                                  active ? "text-brand" : ""
                                )}
                              />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                                    active ? "bg-brand text-white" : "bg-navy-100 text-navy-500 group-hover:bg-white"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Back link */}
      <div className="border-t border-navy-100 p-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-brand-ice hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à app
        </Link>
      </div>
    </aside>
  );
}

function TopbarV2({ onMenu }: { onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3 px-4 backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-300 md:px-6",
        scrolled
          ? "border-b border-navy-100 bg-white/90 shadow-[0_8px_24px_-18px_hsl(218_70%_14%/0.18)]"
          : "border-b border-transparent bg-white/70"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="text-navy-500 hover:bg-brand-ice hover:text-navy lg:hidden v2-press"
        onClick={onMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300 transition-colors duration-200" />
        <Input
          placeholder="Procurar workspaces, utilizadores, faturas…"
          className={cn(
            "h-10 rounded-xl border-navy-100 bg-brand-ice/60 pl-10 pr-16 text-sm text-navy placeholder:text-navy-300",
            "transition-all duration-300 ease-out",
            "focus-visible:border-brand focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:shadow-[0_8px_24px_-12px_hsl(218_100%_54%/0.35)]"
          )}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-navy-300 md:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success v2-soft-pulse" /> Sistema operacional
        </span>
        <button
          type="button"
          aria-label="Notificações"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-500 transition-all duration-200 hover:bg-brand-ice hover:text-navy v2-press"
        >
          <Bell className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-destructive ring-2 ring-white v2-soft-pulse" />
        </button>
        <button
          type="button"
          className="ml-2 hidden h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-navy to-navy-900 px-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_hsl(218_70%_14%/0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-10px_hsl(218_100%_54%/0.45)] hover:from-brand hover:to-brand-vivid sm:inline-flex v2-press"
        >
          <Sparkles className="h-3.5 w-3.5" /> Nova ação
        </button>
      </div>
    </header>
  );
}

export function BackofficeShellV2({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-brand-ice text-navy">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen lg:block">
        <SidebarV2 />
      </div>

      {/* Mobile off-canvas */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 0.34, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-navy-500 transition-colors hover:bg-brand-ice"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
                <SidebarV2 onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopbarV2 onMenu={() => setMobileOpen(true)} />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
