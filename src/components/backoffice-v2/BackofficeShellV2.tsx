import { useState, type ReactNode } from "react";
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
import { Badge } from "@/components/ui/badge";

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
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)] shadow-md shadow-[hsl(220,90%,56%)]/20">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold tracking-tight text-slate-900">Super Admin</div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">FastCRM · Backoffice</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV.map((group) => {
          const isOpen = open.includes(group.id);
          return (
            <div key={group.id}>
              <button
                onClick={() => toggle(group.id)}
                className="flex w-full items-center justify-between px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600"
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
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-1 space-y-0.5">
                      {group.items.map((item) => {
                        const active = pathname === item.to;
                        return (
                          <li key={item.id} className="relative">
                            {active && (
                              <motion.div
                                layoutId="bo-active"
                                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[hsl(220,90%,56%)]/10 to-[hsl(190,95%,50%)]/5 ring-1 ring-[hsl(220,90%,56%)]/20"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                            <Link
                              to={item.to}
                              onClick={onNavigate}
                              className={cn(
                                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                active ? "text-[hsl(220,90%,40%)] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              )}
                            >
                              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-[hsl(220,90%,56%)]" : "text-slate-400")} />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <Badge className="h-5 border-0 bg-[hsl(0,84%,60%)] px-1.5 text-[10px] text-white">{item.badge}</Badge>
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

      <div className="border-t border-slate-200 p-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à app
        </Link>
      </div>
    </aside>
  );
}

function TopbarV2({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Procurar workspaces, utilizadores, faturas…"
          className="h-10 border-slate-200 bg-slate-50 pl-9 pr-16 text-sm focus-visible:ring-[hsl(220,90%,56%)]/30"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 md:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge className="hidden gap-1 border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 sm:inline-flex" variant="outline">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sistema operacional
        </Badge>
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900" aria-label="Notificações">
          <Bell className="h-5 w-5" />
        </Button>
        <Button className="hidden h-9 gap-2 bg-gradient-to-r from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)] text-white shadow-sm hover:opacity-95 sm:inline-flex">
          <Sparkles className="h-4 w-4" /> Nova ação
        </Button>
      </div>
    </header>
  );
}

export function BackofficeShellV2({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
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
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
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
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
