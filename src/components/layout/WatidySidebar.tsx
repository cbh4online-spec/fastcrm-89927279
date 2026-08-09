import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useSidebarFavorites } from "@/hooks/useSidebarFavorites";
import { useSidebarRecents } from "@/hooks/useSidebarRecents";
import {
  buildMegaGroupSections,
  ROUTE_MANIFEST,
  type RouteEntry,
  type MegaGroup,
} from "@/config/routeManifest";
import { OWNER_ONLY_ROUTE_KEYS, isOwnerWorkspace } from "@/config/ownerOnlyRoutes";
import { megaGroupColor } from "./sidebar/megaGroupColors";
import { useDepartmentVisibility } from "@/hooks/useDepartmentVisibility";
import { useMenuOverrideMap } from "@/hooks/useWorkspaceMenuOverrides";
import { resolveRouteVisibility, resolveNavGroupVisibility } from "@/config/menuOverrides";
import {
  X, ChevronRight, Search, Star, Clock, Pin, Lock, Sun, Monitor, Moon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";

import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarNavItem } from "./sidebar/SidebarNavItem";

interface WatidySidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const STORAGE_KEY_GROUPS = "watidy.sidebar.expandedGroups";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ItemTag({ isPro, isBeta }: { isPro?: boolean; isBeta?: boolean }) {
  if (isPro)
    return (
      <Badge variant="outline" className="ml-1 h-4 px-1.5 text-[10px] font-semibold border-amber-500/40 text-amber-500">
        Pro
      </Badge>
    );
  if (isBeta)
    return (
      <Badge variant="outline" className="ml-1 h-4 px-1.5 text-[10px] font-semibold border-blue-400/40 text-blue-400">
        Beta
      </Badge>
    );
  return null;
}

function SidebarFooter() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "light";
  const year = new Date().getFullYear();
  const opts: Array<{ key: string; icon: typeof Sun; label: string }> = [
    { key: "light", icon: Sun, label: "Tema claro" },
    { key: "system", icon: Monitor, label: "Tema do sistema" },
    { key: "dark", icon: Moon, label: "Tema escuro" },
  ];
  return (
    <div className="border-t border-sidebar-border px-3 pt-3 pb-3 space-y-2.5">
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-sidebar-foreground/55">
        <span>Prima</span>
        <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-sidebar-border bg-sidebar-accent text-[10px] font-semibold text-sidebar-foreground/70">
          ?
        </kbd>
        <span>para ver os atalhos</span>
      </div>
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
      <p className="text-[10px] leading-snug text-sidebar-foreground/40 text-center">
        © {year} FastCRM — Todos os direitos reservados
      </p>
    </div>
  );
}

export function WatidySidebar({ open, onClose }: WatidySidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const badges = useSidebarBadges();
  const { installedModuleIds } = useWorkspaceModules();
  const { data: storeSettings } = useStoreSettings();
  const { canAccessMenu } = useMenuPermissions();
  const { favorites, isFavorite, toggleFavorite, max: maxFav } = useSidebarFavorites();
  const { recents } = useSidebarRecents();

  const { getState: getDepartmentState } = useDepartmentVisibility();
  const { map: menuOverrideMap } = useMenuOverrideMap();

  const megaGroupsAll = useMemo(
    () => buildMegaGroupSections(installedModuleIds, canAccessMenu),
    [installedModuleIds, canAccessMenu],
  );

  const isOwner = isOwnerWorkspace(currentWorkspace?.slug);

  const megaGroups = useMemo(() => {
    return megaGroupsAll
      .map((mg) => ({
        ...mg,
        sections: mg.sections
          .filter((s) => resolveNavGroupVisibility(menuOverrideMap, s.key) !== "hidden")
          .map((s) => ({
            ...s,
            items: (isOwner ? s.items : s.items.filter((it) => !OWNER_ONLY_ROUTE_KEYS.has(it.key)))
              .filter((it) => resolveRouteVisibility(menuOverrideMap, it) !== "hidden"),
          }))
          .filter((s) => s.items.length > 0),
        _visibility: getDepartmentState(mg.key),
      }))
      .filter((mg) => mg.sections.length > 0)
      .filter((mg) => mg._visibility.visible || mg._visibility.lockedByPlan);
  }, [megaGroupsAll, getDepartmentState, isOwner, menuOverrideMap]);

  const itemByKey = useMemo(() => {
    const map = new Map<string, RouteEntry>();
    for (const mg of megaGroups) for (const s of mg.sections) for (const i of s.items) map.set(i.key, i);
    for (const r of ROUTE_MANIFEST) if (!map.has(r.key)) map.set(r.key, r);
    return map;
  }, [megaGroups]);

  const isActive = useCallback(
    (href: string, end?: boolean) => {
      const [basePath, hrefSearch] = href.split("?");
      if (hrefSearch) {
        return location.pathname === basePath && location.search === `?${hrefSearch}`;
      }
      if (end || basePath === "/dashboard") return location.pathname === basePath;
      if (location.pathname === basePath && location.search) return false;
      return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
    },
    [location.pathname, location.search],
  );

  const activeMegaFromRoute = useMemo<MegaGroup | null>(() => {
    for (const mg of megaGroups) {
      for (const sec of mg.sections) {
        if (sec.items.some((i) => isActive(i.href, i.end))) return mg.key;
      }
    }
    return null;
  }, [megaGroups, isActive]);

  const [filter, setFilter] = useState("");

  // Estado persistido por mega-grupo expandido
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  // Abre automaticamente o mega-grupo da rota actual (fechando os outros não-"inicio")
  useEffect(() => {
    if (!activeMegaFromRoute) return;
    setExpandedGroups((p) => {
      if (activeMegaFromRoute === "inicio") {
        return p.inicio ? p : { ...p, inicio: true };
      }
      const next: Record<string, boolean> = { ...p };
      for (const key of Object.keys(next)) {
        if (key !== "inicio" && key !== activeMegaFromRoute) next[key] = false;
      }
      next[activeMegaFromRoute] = true;
      return next;
    });
  }, [activeMegaFromRoute]);

  // A partir de "Comercial" (todos excepto "inicio") aplica-se selecção única:
  // abrir um mega-grupo fecha automaticamente os outros do mesmo conjunto.
  const toggleMega = useCallback(
    (k: MegaGroup) => setExpandedGroups((p) => {
      const currentlyOpen = !!p[k];
      if (k === "inicio") {
        return { ...p, [k]: !currentlyOpen };
      }
      if (currentlyOpen) {
        return { ...p, [k]: false };
      }
      // Abrir k → fechar todos os outros não-"inicio"
      const next: Record<string, boolean> = { ...p };
      for (const key of Object.keys(next)) {
        if (key !== "inicio" && key !== k) next[key] = false;
      }
      next[k] = true;
      return next;
    }),
    [],
  );

  const isMegaOpen = useCallback(
    (k: MegaGroup) => {
      if (filter.trim()) return true;
      if (expandedGroups[k] !== undefined) return expandedGroups[k];
      // Abrir por defeito — reduz cliques para chegar a qualquer item (consistente com as secções)
      return true;
    },
    [expandedGroups, filter, activeMegaFromRoute],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((k: string) => setOpenSections((p) => ({ ...p, [k]: !p[k] })), []);
  const isSectionOpen = useCallback(
    (key: string, _items: RouteEntry[]) => {
      if (openSections[key] !== undefined) return openSections[key];
      // Por defeito, secções abrem com o mega-grupo (menos cliques para chegar aos itens)
      return true;
    },
    [openSections],
  );

  const getBadge = useCallback(
    (badgeKey?: string): number => {
      if (!badgeKey) return 0;
      if (badgeKey === "new_leads") return badges.pendingLeads;
      if (badgeKey === "pending_decisions") return badges.pendingDecisions;
      if (badgeKey === "activities_today") return badges.activitiesToday;
      if (badgeKey === "overdue_followups") return badges.overdueFollowups;
      return 0;
    },
    [badges],
  );

  const megaBadge = useCallback(
    (mgKey: MegaGroup) => {
      const mg = megaGroups.find((m) => m.key === mgKey);
      if (!mg) return 0;
      let total = 0;
      for (const s of mg.sections) for (const i of s.items) total += getBadge(i.badgeKey);
      return total;
    },
    [megaGroups, getBadge],
  );

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilizador";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const workspaceName = storeSettings?.store_name || currentWorkspace?.name || "Workspace";
  const logoUrl = storeSettings?.logo_url;

  const favoriteItems = favorites.map((k) => itemByKey.get(k)).filter(Boolean) as RouteEntry[];
  const recentItems = recents.map((k) => itemByKey.get(k)).filter(Boolean) as RouteEntry[];

  // Filtra secções de um mega-grupo pelo input de pesquisa
  const filterSections = useCallback(
    (sections: typeof megaGroups[number]["sections"]) => {
      if (!filter.trim()) return sections;
      const q = filter.toLowerCase();
      return sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
        .filter((s) => s.items.length > 0);
    },
    [filter],
  );

  // ── Item renderer ──
  const renderItem = (item: RouteEntry) => {
    const active = isActive(item.href, item.end);
    const badgeCount = getBadge(item.badgeKey);
    const hasTag = item.isPro || item.isBeta;
    const fav = isFavorite(item.key);
    return (
      <div key={item.key} className="group relative">
        <SidebarNavItem
          to={item.href}
          onClick={onClose}
          active={active}
          icon={item.icon}
          label={item.label}
          className="pr-8"
          trailing={hasTag && !badgeCount ? <ItemTag isPro={item.isPro} isBeta={item.isBeta} /> : null}
          badge={<NavBadge count={badgeCount} />}
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.key); }}
          aria-label={fav ? "Desafixar dos favoritos" : "Fixar nos favoritos"}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity",
            fav
              ? "opacity-100 text-amber-400 hover:text-amber-300"
              : "opacity-0 group-hover:opacity-100 text-sidebar-foreground/40 hover:text-sidebar-foreground",
          )}
        >
          <Star className={cn("w-3 h-3", fav && "fill-current")} />
        </button>
      </div>
    );
  };

  const renderCompactLink = (item: RouteEntry) => {
    const active = isActive(item.href, item.end);
    const badgeCount = getBadge(item.badgeKey);
    return (
      <SidebarNavItem
        key={item.key}
        to={item.href}
        onClick={onClose}
        active={active}
        icon={item.icon}
        label={item.label}
        badge={<NavBadge count={badgeCount} />}
      />
    );
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

      <aside
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[288px] transform transition-transform duration-200 ease-out lg:translate-x-0",
          "bg-sidebar border-r border-sidebar-border",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Workspace switcher (já mostra o logo + nome do workspace) */}
        <div className="px-3 py-3 border-b border-sidebar-border flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <WorkspaceSwitcher collapsed={false} />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>


        {/* Pesquisa */}
        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/30" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-accent/50 border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus:outline-none focus:ring-1 focus:ring-sidebar-primary/50"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1" aria-label="Navegação">
          {/* Favoritos */}
          {favoriteItems.length > 0 && !filter && (
            <div className="pb-2">
              <div className="px-2.5 pb-1 flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-400 fill-current" />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                  Favoritos
                </span>
                <span className="ml-auto text-[10px] text-sidebar-foreground/30">{favoriteItems.length}/{maxFav}</span>
              </div>
              <div className="space-y-0.5">{favoriteItems.map((it) => renderCompactLink(it))}</div>
            </div>
          )}

          {/* Todos os mega-grupos colapsáveis */}
          {megaGroups.map((mg) => {
            const color = megaGroupColor(mg.key);
            const HeaderIcon = mg.icon;
            const count = megaBadge(mg.key);
            const locked = (mg as { _visibility?: { lockedByPlan: boolean } })._visibility?.lockedByPlan ?? false;
            const sections = filterSections(mg.sections);
            const open = isMegaOpen(mg.key);
            const isActiveRoute = activeMegaFromRoute === mg.key;

            // Se há filtro e nenhuma secção corresponde, esconde o grupo
            if (filter.trim() && sections.length === 0) return null;

            return (
              <Collapsible
                key={mg.key}
                open={open}
                onOpenChange={() => toggleMega(mg.key)}
              >
                <CollapsibleTrigger className="w-full group" disabled={locked}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                      isActiveRoute
                        ? "bg-sidebar-accent"
                        : "hover:bg-sidebar-accent/50",
                      locked && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <HeaderIcon
                      className="w-[18px] h-[18px] shrink-0"
                      strokeWidth={1.75}
                      style={{ color: `hsl(${color.fg})` }}
                    />
                    <span className="flex-1 text-left text-[13.5px] font-semibold text-sidebar-foreground truncate">
                      {mg.label}
                    </span>
                    {locked ? (
                      <Lock className="w-3 h-3 text-sidebar-foreground/50" />
                    ) : count > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                    {!locked && (
                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform duration-200",
                          open && "rotate-90",
                        )}
                      />
                    )}
                  </div>
                </CollapsibleTrigger>

                {locked ? (
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="px-3 py-3 mx-2 my-1 rounded-md bg-sidebar-accent/30 space-y-2">
                      <p className="text-xs text-sidebar-foreground/70">
                        {mg.description || "Departamento não incluído no seu plano actual."}
                      </p>
                      <Link
                        to="/settings/billing"
                        onClick={onClose}
                        className="block w-full text-center px-3 py-1.5 text-xs font-semibold rounded-md bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors"
                      >
                        Fazer upgrade do plano
                      </Link>
                    </div>
                  </CollapsibleContent>
                ) : (
                  <CollapsibleContent
                    className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
                    style={{ ["--mega-fg" as string]: `hsl(${color.fg})` }}
                  >
                    <div className="pl-2 pr-1 pb-1 pt-0.5 space-y-1">
                      {sections.map((section) => {
                        // Sempre expandido — sem contadores nem chevrons para reduzir cliques
                        const singleSection = sections.length === 1;
                        return (
                          <div key={section.key} className={singleSection ? "pt-1" : "pt-2"}>
                            {!singleSection && (
                              <div className="px-3 pb-1">
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/35">
                                  {section.label}
                                </span>
                              </div>
                            )}
                            <div className="space-y-0.5">{section.items.map(renderItem)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}

          {/* Recentes */}
          {recentItems.length > 0 && !filter && (
            <div className="pt-3">
              <div className="px-2.5 pb-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-sidebar-foreground/40" />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                  Recentes
                </span>
              </div>
              <div className="space-y-0.5">{recentItems.slice(0, 5).map((it) => renderCompactLink(it))}</div>
            </div>
          )}
        </nav>


        {/* Footer */}
        <SidebarFooter />

      </aside>
    </>
  );
}
