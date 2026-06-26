import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import {
  LayoutGrid,
  Euro,
  Users,
  Package,
  Calendar,
  FileText,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Sun,
  Monitor,
  Moon,
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface InvoiceXpressSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

type NavItem = {
  key: string;
  label: string;
  href?: string;
  icon: typeof LayoutGrid;
  onClick?: () => void;
};

type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
};

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "light";
  const opts = [
    { key: "light", icon: Sun, label: "Tema claro" },
    { key: "system", icon: Monitor, label: "Tema do sistema" },
    { key: "dark", icon: Moon, label: "Tema escuro" },
  ] as const;
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-sidebar-accent/60 border border-sidebar-border">
      {opts.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-label={opt.label}
            aria-pressed={active}
            onClick={() => setTheme(opt.key)}
            className={cn(
              "flex-1 flex items-center justify-center h-7 rounded-full transition-colors",
              active
                ? "bg-background text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}

export function InvoiceXpressSidebar({ open, onClose }: InvoiceXpressSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { data: storeSettings } = useStoreSettings();

  const workspaceName = storeSettings?.store_name || currentWorkspace?.name || "Workspace";
  const logoUrl = storeSettings?.logo_url;
  const year = new Date().getFullYear();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const sections: NavSection[] = useMemo(
    () => [
      {
        key: "vendas",
        label: "Vendas",
        items: [
          { key: "overview", label: "Visão Global", href: "/dashboard", icon: LayoutGrid },
          { key: "invoices", label: "Faturas", href: "/dashboard/invoices", icon: Euro },
          { key: "contacts", label: "Contactos", href: "/dashboard/contacts", icon: Users },
          { key: "items", label: "Itens", href: "/dashboard/products", icon: Package },
          { key: "scheduling", label: "Agendamentos", href: "/dashboard/scheduling", icon: Calendar },
          { key: "proposals", label: "Orçamentos", href: "/dashboard/proposals", icon: FileText },
          { key: "guides", label: "Guias", href: "/dashboard/rentals", icon: Truck },
          { key: "reports", label: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
        ],
      },
      {
        key: "conta",
        label: "Conta",
        items: [
          { key: "settings", label: "Configurações", href: "/settings", icon: Settings },
          { key: "logout", label: "Logout", icon: LogOut, onClick: handleLogout },
        ],
      },
    ],
    [],
  );

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const className = cn(
      "flex items-center gap-3 pl-3 pr-4 py-2 rounded-full text-[13.5px] font-semibold transition-colors w-full",
      active
        ? "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))] shadow-sm"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    );
    const inner = (
      <>
        <Icon
          className={cn(
            "w-[18px] h-[18px] shrink-0",
            active ? "text-[hsl(var(--sidebar-active-fg))]" : "text-sidebar-foreground/70",
          )}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
      </>
    );
    if (item.onClick) {
      return (
        <button key={item.key} type="button" onClick={item.onClick} className={className}>
          {inner}
        </button>
      );
    }
    return (
      <Link
        key={item.key}
        to={item.href!}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {inner}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={workspaceName}
                className="w-9 h-9 rounded-lg object-contain"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary/15 flex items-center justify-center shrink-0">
                <span className="text-sidebar-primary font-bold text-sm">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <p className="text-sm font-bold text-sidebar-foreground truncate flex-1">
              {workspaceName}
            </p>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace switcher */}
          <div className="px-3 py-2 border-b border-sidebar-border">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left"
            >
              <Users className="w-4 h-4 text-sidebar-foreground/60" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <WorkspaceSwitcher collapsed={false} />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/40" />
            </button>
          </div>

          {/* Sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5" aria-label="Navegação">
            {sections.map((section) => (
              <div key={section.key}>
                <div className="px-3 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
                <div className="space-y-1">{section.items.map(renderItem)}</div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-3 pt-3 pb-3 space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-sidebar-foreground/55">
              <span>Prima</span>
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-sidebar-border bg-sidebar-accent text-[10px] font-semibold text-sidebar-foreground/70">
                ?
              </kbd>
              <span>para ver os atalhos</span>
            </div>
            <ThemeSwitcher />
            <p className="text-[10px] leading-snug text-sidebar-foreground/40 text-center">
              © {year} FastCRM — Todos os direitos reservados
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
