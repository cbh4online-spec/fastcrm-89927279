import { useMemo, useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
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
import { megaGroupColor } from "./sidebar/megaGroupColors";
import { useDepartmentVisibility } from "@/hooks/useDepartmentVisibility";
import {
  X, ChevronRight, Search, PanelLeftClose, PanelLeftOpen,
  Star, Clock, Pin, Lock,
} from "lucide-react";

import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface WatidySidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const STORAGE_KEY_GROUP = "watidy_sidebar_active_group";

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

export function WatidySidebar({ open, onClose }: WatidySidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const badges = useSidebarBadges();
  const { installedModuleIds } = useWorkspaceModules();
  const { data: storeSettings } = useStoreSettings();
  const { canAccessMenu } = useMenuPermissions();
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const { favorites, isFavorite, toggleFavorite, max: maxFav } = useSidebarFavorites();
  const { recents } = useSidebarRecents();
  const panelOpen = !collapsed;

  const { getState: getDepartmentState, isVisible: isDepartmentVisible } = useDepartmentVisibility();

  const megaGroupsAll = useMemo(
    () => buildMegaGroupSections(installedModuleIds, canAccessMenu),
    [installedModuleIds, canAccessMenu],
  );

  /**
   * Filtra os mega-groups pela visibilidade do plano:
   *  - visible       → mostra normalmente
   *  - lockedByPlan  → mostra com cadeado (CTA upgrade)
   *  - outros        → escondidos
   */
  const megaGroups = useMemo(() => {
    return megaGroupsAll
      .map((mg) => ({ ...mg, _visibility: getDepartmentState(mg.key) }))
      .filter((mg) => mg._visibility.visible || mg._visibility.lockedByPlan);
  }, [megaGroupsAll, getDepartmentState]);

  // Lookup map: key → RouteEntry (only entries visible in some mega-group)
  const itemByKey = useMemo(() => {
    const map = new Map<string, RouteEntry>();
    for (const mg of megaGroups) for (const s of mg.sections) for (const i of s.items) map.set(i.key, i);
    // Also allow recents to fall back to full manifest (e.g. hidden-but-active routes)
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

  const [activeMega, setActiveMega] = useState<MegaGroup>(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY_GROUP) as MegaGroup | null) : null;
    return stored || megaGroups[0]?.key || "inicio";
  });


  useEffect(() => {
    if (activeMegaFromRoute && activeMegaFromRoute !== activeMega) setActiveMega(activeMegaFromRoute);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMegaFromRoute]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUP, activeMega);
  }, [activeMega]);

  const togglePanel = toggleCollapse;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        togglePanel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePanel]);

  const [filter, setFilter] = useState("");
  const activeMegaData = megaGroups.find((m) => m.key === activeMega) || megaGroups[0];
  const filteredSections = useMemo(() => {
    if (!activeMegaData) return [];
    if (!filter.trim()) return activeMegaData.sections;
    const q = filter.toLowerCase();
    return activeMegaData.sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [activeMegaData, filter]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = useCallback((k: string) => setOpenGroups((p) => ({ ...p, [k]: !p[k] })), []);
  const isGroupOpen = useCallback(
    (key: string, items: RouteEntry[]) => {
      if (openGroups[key] !== undefined) return openGroups[key];
      if (filter.trim()) return true;
      return items.some((i) => isActive(i.href, i.end));
    },
    [openGroups, isActive, filter],
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

  // ── Item renderer (panel) ──
  const renderItem = (item: RouteEntry) => {
    const active = isActive(item.href, item.end);
    const Icon = item.icon;
    const badgeCount = getBadge(item.badgeKey);
    const hasTag = item.isPro || item.isBeta;
    const fav = isFavorite(item.key);
    return (
      <div key={item.key} className="group relative">
        <Link
          to={item.href}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 pl-2.5 pr-7 py-1.5 rounded-md text-sm font-medium transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Icon className={cn("w-4 h-4 shrink-0", active && "text-sidebar-primary")} />
          <span className="flex-1 truncate">{item.label}</span>
          {hasTag && !badgeCount ? <ItemTag isPro={item.isPro} isBeta={item.isBeta} /> : null}
          <NavBadge count={badgeCount} />
        </Link>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.key); }}
          aria-label={fav ? "Desafixar dos favoritos" : "Fixar nos favoritos"}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity",
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

  // ── Compact item renderer for hover popover & rail blocks ──
  const renderCompactLink = (item: RouteEntry, color?: string) => {
    const active = isActive(item.href, item.end);
    const Icon = item.icon;
    const badgeCount = getBadge(item.badgeKey);
    return (
      <Link
        key={item.key}
        to={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
        style={active && color ? { color: `hsl(${color})` } : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <NavBadge count={badgeCount} />
      </Link>
    );
  };

  // ── Favorites/Recents resolved entries ──
  const favoriteItems = favorites.map((k) => itemByKey.get(k)).filter(Boolean) as RouteEntry[];
  const recentItems = recents.map((k) => itemByKey.get(k)).filter(Boolean) as RouteEntry[];

  const totalWidthClass = panelOpen ? "w-[304px]" : "w-14";

  return (
    <TooltipProvider delayDuration={0}>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

      <aside
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex transform transition-all duration-200 ease-out lg:translate-x-0",
          "bg-sidebar border-r border-sidebar-border",
          totalWidthClass,
          open ? "translate-x-0 w-[304px]" : "-translate-x-full",
        )}
      >
        {/* ───────────────────────────── RAIL ───────────────────────────── */}
        <div className="flex flex-col items-center w-14 shrink-0 border-r border-sidebar-border py-2 gap-1">
          {/* Workspace logo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => togglePanel()}
                className="w-9 h-9 rounded-lg bg-sidebar-primary/15 flex items-center justify-center shrink-0 hover:bg-sidebar-primary/25 transition-colors"
                aria-label={workspaceName}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={workspaceName} className="w-7 h-7 rounded-md object-contain" />
                ) : (
                  <span className="text-sidebar-primary font-bold text-xs">{workspaceName.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-semibold">{workspaceName}</p>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </TooltipContent>
          </Tooltip>

          {/* Scrollable rail body */}
          <div className="flex-1 w-full overflow-y-auto scrollbar-thin px-1.5 flex flex-col items-center gap-1">
            {/* ─ Favorites ─ */}
            {favoriteItems.length > 0 && (
              <>
                <div className="my-1 h-px w-7 bg-sidebar-border" />
                {favoriteItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.end);
                  const badgeCount = getBadge(item.badgeKey);
                  return (
                    <Tooltip key={`fav-${item.key}`}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative w-full flex items-center justify-center h-9 rounded-lg transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-primary"
                              : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className="w-[17px] h-[17px]" />
                          <Star className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-amber-400 fill-current" />
                          {badgeCount > 0 && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[8px] font-bold text-sidebar-primary-foreground">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">★ {item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            )}

            {/* ─ Mega-group icons ─ */}
            <div className="my-1 h-px w-7 bg-sidebar-border" />
            {megaGroups.map((mg) => {
              const Icon = mg.icon;
              const isActiveMega = activeMega === mg.key;
              const fromRoute = activeMegaFromRoute === mg.key;
              const count = megaBadge(mg.key);
              const color = megaGroupColor(mg.key);
              const locked = (mg as { _visibility?: { lockedByPlan: boolean } })._visibility?.lockedByPlan ?? false;
              return (
                <HoverCard key={mg.key} openDelay={120} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveMega(mg.key);
                        if (!panelOpen) togglePanel();
                      }}
                      aria-current={fromRoute ? "page" : undefined}
                      aria-label={locked ? `${mg.label} (bloqueado pelo plano)` : mg.label}
                      className={cn(
                        "relative w-full flex items-center justify-center h-10 rounded-lg transition-colors",
                        isActiveMega
                          ? "text-sidebar-foreground"
                          : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
                        locked && "opacity-60",
                      )}
                      style={
                        isActiveMega
                          ? { backgroundColor: `hsl(${color.bg})`, color: `hsl(${color.fg})` }
                          : undefined
                      }
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {fromRoute && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r"
                          style={{ backgroundColor: `hsl(${color.fg})` }}
                        />
                      )}
                      {locked ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sidebar-border text-sidebar-foreground/70">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      ) : count > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-64 p-2 bg-sidebar border-sidebar-border"
                  >
                    <div className="px-2 pb-2 mb-1 border-b border-sidebar-border flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: `hsl(${color.fg})` }} />
                      <span className="text-sm font-bold text-sidebar-foreground flex-1">{mg.label}</span>
                      {locked && <Lock className="w-3 h-3 text-sidebar-foreground/50" />}
                    </div>
                    {locked ? (
                      <div className="px-2 py-3 space-y-2">
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
                    ) : (
                      <div className="max-h-[60vh] overflow-y-auto space-y-2 scrollbar-thin">
                        {mg.sections.map((sec) => (
                          <div key={`hover-${mg.key}-${sec.key}`}>
                            <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                              {sec.label}
                            </div>
                            <div className="space-y-0.5">
                              {sec.items.map((it) => renderCompactLink(it, color.fg))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </HoverCardContent>
                </HoverCard>
              );
            })}


            {/* ─ Recents ─ */}
            {recentItems.length > 0 && (
              <>
                <div className="my-1 h-px w-7 bg-sidebar-border" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-full h-5 text-sidebar-foreground/35">
                      <Clock className="w-3 h-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Recentes</TooltipContent>
                </Tooltip>
                {recentItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.end);
                  return (
                    <Tooltip key={`rec-${item.key}`}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            "w-full flex items-center justify-center h-8 rounded-lg transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-primary"
                              : "text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer rail */}
          <div className="flex flex-col items-center gap-1 w-full px-1.5 pt-1 border-t border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={togglePanel}
                  className="hidden lg:flex w-full items-center justify-center h-9 rounded-lg text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  aria-label={panelOpen ? "Recolher painel" : "Expandir painel"}
                >
                  {panelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{panelOpen ? "Recolher (⌘B)" : "Expandir (⌘B)"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-[10px] font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{userName}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ───────────────────────────── PANEL ───────────────────────────── */}
        {panelOpen && activeMegaData && (() => {
          const color = megaGroupColor(activeMegaData.key);
          const HeaderIcon = activeMegaData.icon;
          return (
            <div className="flex flex-col w-[248px] min-w-0">
              {/* Panel header */}
              <div
                className="px-3 py-3 border-b border-sidebar-border flex items-center gap-2"
                style={{ borderTop: `2px solid hsl(${color.fg})` }}
              >
                <HeaderIcon className="w-4 h-4 shrink-0" style={{ color: `hsl(${color.fg})` }} />
                <h2 className="text-sm font-bold text-sidebar-foreground truncate flex-1">{activeMegaData.label}</h2>
                <button
                  onClick={onClose}
                  className="lg:hidden p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Workspace switcher */}
              <div className="px-3 py-2 border-b border-sidebar-border">
                <WorkspaceSwitcher collapsed={false} />
              </div>

              {/* Search */}
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

              {/* Favorites quick block (in panel) */}
              {favoriteItems.length > 0 && !filter && (
                <div className="px-2 pt-2">
                  <div className="px-2.5 pb-1 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      Favoritos
                    </span>
                    <span className="ml-auto text-[10px] text-sidebar-foreground/30">{favoriteItems.length}/{maxFav}</span>
                  </div>
                  <div className="space-y-0.5">{favoriteItems.map((it) => renderCompactLink(it))}</div>
                </div>
              )}

              {/* Sections */}
              <nav
                className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1"
                aria-label="Subgrupos"
                style={{ ["--mega-fg" as string]: `hsl(${color.fg})` }}
              >
                {filteredSections.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-sidebar-foreground/40">
                    Sem resultados.
                  </div>
                )}
                {filteredSections.map((section) => {
                  const SectionIcon = section.icon;
                  if (!section.collapsible) {
                    return (
                      <div key={section.key} className="pt-1">
                        <div className="px-2.5 pb-1 flex items-center gap-1.5">
                          <SectionIcon className="w-3 h-3 text-sidebar-foreground/30" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
                            {section.label}
                          </span>
                        </div>
                        <div className="space-y-0.5">{section.items.map(renderItem)}</div>
                      </div>
                    );
                  }
                  const groupOpen = isGroupOpen(section.key, section.items);
                  return (
                    <Collapsible key={section.key} open={groupOpen} onOpenChange={() => toggleGroup(section.key)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors">
                          <SectionIcon className="w-3 h-3 shrink-0" />
                          <span className="flex-1 text-left truncate">{section.label}</span>
                          <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", groupOpen && "rotate-90")} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-0.5 mt-0.5">
                        {section.items.map(renderItem)}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {/* Hint */}
                {!filter && favoriteItems.length < maxFav && (
                  <div className="mt-3 px-3 py-2 rounded-md bg-sidebar-accent/30 border border-dashed border-sidebar-border text-[10px] text-sidebar-foreground/40 flex items-start gap-1.5">
                    <Pin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Passe o rato sobre um item e clique em <Star className="inline w-2.5 h-2.5 -mt-0.5" /> para fixar nos favoritos.</span>
                  </div>
                )}
              </nav>
            </div>
          );
        })()}
      </aside>
    </TooltipProvider>
  );
}
