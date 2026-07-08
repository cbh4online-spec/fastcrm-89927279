import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Monitor,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { IX_NAV_SECTIONS, type IXNavGroup } from "@/config/navigation/ixNavigation";
import { ROUTE_MANIFEST, type RouteEntry } from "@/config/routeManifest";

interface InvoiceXpressSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const ROUTE_INDEX: Record<string, RouteEntry> = ROUTE_MANIFEST.reduce(
  (acc, r) => {
    acc[r.key] = r;
    return acc;
  },
  {} as Record<string, RouteEntry>,
);

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
  const permissions = useMenuPermissions();
  const { installedSlugs } = useInstalledModules();
  const isModuleInstalled = (slug: string) => installedSlugs.includes(slug);

  const workspaceName = storeSettings?.store_name || currentWorkspace?.name || "Workspace";
  const logoUrl = storeSettings?.logo_url;
  const year = new Date().getFullYear();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const canShow = (routeKey?: string) => {
    if (!routeKey) return true;
    const entry = ROUTE_INDEX[routeKey];
    if (!entry) return true; // desconhecido → não bloquear
    if (entry.status !== "active") return false;
    if (entry.moduleSlug && !isModuleInstalled(entry.moduleSlug)) return false;
    if (entry.menuKey && permissions?.[entry.menuKey as keyof typeof permissions] === false) return false;
    return true;
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Grupo activo (para auto-expandir o accordion certo)
  const activeGroupKey = useMemo(() => {
    for (const section of IX_NAV_SECTIONS) {
      for (const g of section.groups) {
        if (isActive(g.href)) return g.key;
        const child = g.children?.find((c) => {
          const entry = ROUTE_INDEX[c.key];
          return entry && isActive(entry.href);
        });
        if (child) return g.key;
      }
    }
    return "overview";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpanded((prev) => ({ ...prev, [activeGroupKey]: true }));
  }, [activeGroupKey]);

  const toggleGroup = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderGroup = (group: IXNavGroup) => {
    if (!canShow(group.primaryKey)) return null;

    const Icon = group.icon;
    const primaryActive = isActive(group.href);
    const isOpen = expanded[group.key] ?? primaryActive;

    const children = (group.children ?? [])
      .map((c) => ({ ...c, entry: ROUTE_INDEX[c.key] }))
      .filter((c) => c.entry && canShow(c.key));

    return (
      <div key={group.key} className="space-y-0.5">
        <div className="flex items-stretch">
          <Link
            to={group.href}
            onClick={onClose}
            aria-current={primaryActive ? "page" : undefined}
            className={cn(
              "flex-1 flex items-center gap-3 pl-3 pr-2 py-2 rounded-full text-[13.5px] font-semibold transition-colors",
              primaryActive
                ? "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))] shadow-sm"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "w-[18px] h-[18px] shrink-0",
                primaryActive ? "text-[hsl(var(--sidebar-active-fg))]" : "text-sidebar-foreground/70",
              )}
              strokeWidth={1.75}
            />
            <span className="flex-1 truncate text-left">{group.label}</span>
          </Link>
          {children.length > 0 && (
            <button
              type="button"
              aria-label={isOpen ? "Colapsar" : "Expandir"}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.key)}
              className="ml-1 w-7 flex items-center justify-center rounded-full text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
          )}
        </div>

        {isOpen && children.length > 0 && (
          <div className="ml-4 pl-4 border-l border-sidebar-border/60 space-y-0.5 py-1">
            {children.map((c) => {
              const entry = c.entry!;
              const active = isActive(entry.href);
              return (
                <Link
                  key={c.key}
                  to={entry.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors truncate",
                    active
                      ? "text-[hsl(var(--sidebar-active-fg))] bg-sidebar-accent"
                      : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  {c.label ?? entry.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
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
            <WorkspaceSwitcher collapsed={false} />
          </div>

          {/* Sections */}
          <nav
            className="flex-1 overflow-y-auto px-3 py-3 space-y-5"
            aria-label="Navegação"
          >
            {IX_NAV_SECTIONS.map((section) => {
              const renderedGroups = section.groups
                .map((g) => renderGroup(g))
                .filter(Boolean);
              if (renderedGroups.length === 0) return null;
              return (
                <div key={section.key}>
                  <div className="px-3 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                      {section.label}
                    </span>
                  </div>
                  <div className="space-y-1">{renderedGroups}</div>
                </div>
              );
            })}

            {/* Logout (sempre visível) */}
            <div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 pl-3 pr-4 py-2 rounded-full text-[13.5px] font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <LogOut className="w-[18px] h-[18px] shrink-0 text-sidebar-foreground/70" strokeWidth={1.75} />
                  <span className="flex-1 text-left">Terminar sessão</span>
                </button>
              </div>
            </div>
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
