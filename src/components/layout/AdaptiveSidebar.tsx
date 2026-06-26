import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useAppMode } from "@/hooks/useAppMode";
import {
  buildSidebarSections,
  type RouteEntry,
  type NavGroupMeta,
} from "@/config/routeManifest";
import type { AgeGroup, SalesFunction } from "@/data/adaptiveDashboardMock";
import {
  X, PanelLeftClose, PanelLeftOpen, ChevronRight,
  Eye, ChevronDown, RotateCcw, Search, Sparkles, Crown,
  Sun, Monitor, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface AdaptiveSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

function IXThemeSwitcher() {
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

// ── Age-based style config ──
interface AgeStyle {
  iconSize: string;
  textSize: string;
  itemHeight: string;
  animationsEnabled: boolean;
  collapsibleGroups: boolean;
}

const ageStyles: Record<AgeGroup, AgeStyle> = {
  young:    { iconSize: "w-4 h-4", textSize: "text-sm", itemHeight: "py-2", animationsEnabled: true, collapsibleGroups: true },
  standard: { iconSize: "w-4 h-4", textSize: "text-sm", itemHeight: "py-2", animationsEnabled: true, collapsibleGroups: true },
  senior:   { iconSize: "w-5 h-5", textSize: "text-base", itemHeight: "py-2.5", animationsEnabled: false, collapsibleGroups: false },
};

// ── Badge Component ──
function SidebarBadge({ count, animate }: { count: number; animate?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        "bg-sidebar-primary text-sidebar-primary-foreground",
        animate && count > 5 && "animate-pulse"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Pro / Beta tag ──
function ItemTag({ isPro, isBeta }: { isPro?: boolean; isBeta?: boolean }) {
  if (isPro) return <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px] font-semibold border-amber-500/40 text-amber-500">Pro</Badge>;
  if (isBeta) return <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px] font-semibold border-blue-400/40 text-blue-400">Beta</Badge>;
  return null;
}

export function AdaptiveSidebar({ open, onClose, onOpen }: AdaptiveSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const { ageGroup, salesFunction, realSalesFunction, isOverridden, setSalesFunctionOverride, clearOverride } = useAdaptiveDashboard();
  const badges = useSidebarBadges();
  const { installedModuleIds } = useWorkspaceModules();
  const { data: storeSettings } = useStoreSettings();
  const { canAccessMenu } = useMenuPermissions();
  const { mode } = useAppMode();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [menuFilter, setMenuFilter] = useState("");

  const style = ageStyles[ageGroup];
  const isSenior = ageGroup === "senior";
  const isCollapsed = !isSenior && collapsed && !open;

  // ── Build sidebar sections from manifest ──
  const sections = useMemo(
    () => buildSidebarSections(installedModuleIds, canAccessMenu, mode),
    [installedModuleIds, canAccessMenu, salesFunction, mode]
  );

  // ── Filter sections by search ──
  const filteredSections = useMemo(() => {
    if (!menuFilter.trim()) return sections;
    const q = menuFilter.toLowerCase();
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, menuFilter]);

  // ── Collapsible group state ──
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    [location.pathname, location.search]
  );

  const sectionHasActive = useCallback(
    (items: RouteEntry[]) => items.some((i) => isActive(i.href, i.end)),
    [isActive]
  );

  const isGroupOpen = useCallback(
    (key: string, items: RouteEntry[]) => {
      if (!style.collapsibleGroups) return true;
      if (openGroups[key] !== undefined) return openGroups[key];
      return sectionHasActive(items);
    },
    [openGroups, sectionHasActive, style.collapsibleGroups]
  );

  const toggleGroup = useCallback((name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const getBadge = useCallback(
    (badgeKey?: string): number => {
      if (!badgeKey) return 0;
      if (badgeKey === "new_leads") return badges.pendingLeads;
      if (badgeKey === "pending_decisions") return badges.pendingDecisions;
      if (badgeKey === "activities_today") return badges.activitiesToday;
      if (badgeKey === "overdue_followups") return badges.overdueFollowups;
      return 0;
    },
    [badges]
  );

  // ── Touch swipe ──
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (open && delta < -50) onClose();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchend", onEnd); };
  }, [open, onClose]);

  // Edge swipe to open
  useEffect(() => {
    let edgeX = -1;
    const onStart = (e: TouchEvent) => { edgeX = (!open && e.touches[0].clientX < 20) ? e.touches[0].clientX : -1; };
    const onEnd = (e: TouchEvent) => { if (edgeX >= 0 && e.changedTouches[0].clientX - edgeX > 50 && onOpen) onOpen(); };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => { document.removeEventListener("touchstart", onStart); document.removeEventListener("touchend", onEnd); };
  }, [open, onOpen]);

  // ⌘B to toggle collapse
  useEffect(() => {
    if (isSenior) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); toggleCollapse(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleCollapse, isSenior]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilizador";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const roleLabelMap: Record<string, string> = {
    vendedor: "Vendedor", gestor: "Gestor de Vendas", diretor: "Diretor Comercial", ceo: "CEO / Founder",
  };
  const workspaceName = storeSettings?.store_name || currentWorkspace?.name || "Workspace";
  const logoUrl = storeSettings?.logo_url;

  // ── Render Link ──
  const renderLink = (item: RouteEntry, indent = false) => {
    const active = isActive(item.href, item.end);
    const Icon = item.icon;
    const badgeCount = getBadge(item.badgeKey);
    const hasTag = item.isPro || item.isBeta;

    if (isCollapsed) {
      return (
        <Tooltip key={item.key}>
          <TooltipTrigger asChild>
            <Link
              to={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center p-2 rounded-lg transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn(style.iconSize, active && "text-sidebar-primary")} />
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-bold text-sidebar-primary-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
            {item.isPro && <span className="ml-1 text-amber-400 text-[10px]">Pro</span>}
            {item.isBeta && <span className="ml-1 text-blue-400 text-[10px]">Beta</span>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.key}
        to={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 rounded-full font-semibold transition-colors",
          style.itemHeight, style.textSize,
          indent && "pl-10",
          active
            ? "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))] shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon
          className={cn(style.iconSize, "shrink-0", active ? "text-[hsl(var(--sidebar-active-fg))]" : "text-sidebar-foreground/70")}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {hasTag && !badgeCount ? <ItemTag isPro={item.isPro} isBeta={item.isBeta} /> : null}
        <SidebarBadge count={badgeCount} animate={style.animationsEnabled} />
      </Link>
    );
  };

  // ── Render Section ──
  const renderSection = (section: NavGroupMeta & { items: RouteEntry[] }, idx: number) => {
    const hasActive = sectionHasActive(section.items);
    const SectionIcon = section.icon;

    if (!section.collapsible || !style.collapsibleGroups) {
      return (
        <div key={section.key} className={cn(idx > 0 && "mt-3")} role="group" aria-label={section.label}>
          {!isCollapsed && (
            <div className="px-3 pb-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                {section.label}
              </span>
            </div>
          )}
          {isCollapsed && idx > 0 && <div className="my-2 mx-2 border-t border-sidebar-border" />}
          <div className="space-y-1">{section.items.map((item) => renderLink(item))}</div>
        </div>
      );
    }

    const groupOpen = isGroupOpen(section.key, section.items);
    return (
      <Collapsible key={section.key} open={groupOpen} onOpenChange={() => toggleGroup(section.key)} className={cn(idx > 0 && "mt-1")}>
        {!isCollapsed ? (
          <div role="group" aria-label={section.label}>
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center gap-3 px-3 rounded-lg font-medium cursor-pointer transition-colors",
                style.itemHeight, style.textSize,
                hasActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <SectionIcon className={cn(style.iconSize, "shrink-0", hasActive && "text-sidebar-primary")} />
                <span className="flex-1 text-left truncate">{section.label}</span>
                <ChevronRight className={cn("w-3.5 h-3.5 text-sidebar-foreground/30 transition-transform duration-200", groupOpen && "rotate-90")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-0.5">
              {section.items.map((item) => renderLink(item, true))}
            </CollapsibleContent>
          </div>
        ) : (
          <>
            {idx > 0 && <div className="my-2 mx-2 border-t border-sidebar-border" />}
            {section.items.map((item) => renderLink(item))}
          </>
        )}
      </Collapsible>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <>
        {/* Mobile overlay */}
        {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

        <aside
          ref={sidebarRef}
          role="navigation"
          aria-label="Menu principal"
          className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:translate-x-0",
            "bg-sidebar border-r border-sidebar-border",
            isSenior ? "w-[280px]" : isCollapsed ? "w-16" : "w-[280px]",
            open ? "translate-x-0 w-[280px]" : "-translate-x-full",
            isSenior && "[&_*]:!transition-none"
          )}
        >
          <div className="flex flex-col h-full">

            {/* ═══ BLOCK 1: Brand Header ═══ */}
            <div className={cn("border-b border-sidebar-border", isCollapsed ? "px-2 py-3" : "px-4 py-4")}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt={workspaceName} className="w-8 h-8 rounded-lg object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                          <span className="text-sidebar-primary font-bold text-xs">{workspaceName.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-semibold">{workspaceName}</p>
                    <p className="text-xs text-muted-foreground">{userName} · {roleLabelMap[salesFunction]}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt={workspaceName} className="w-9 h-9 rounded-lg object-contain" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sidebar-primary font-bold text-sm">{workspaceName.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-sidebar-foreground truncate">{workspaceName}</p>
                      <WorkspaceSwitcher collapsed={false} />
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50" aria-label="Fechar menu">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-[10px] font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-sidebar-foreground/80 truncate">{userName}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors group">
                            {isOverridden && <Eye className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                            <span className="truncate">{roleLabelMap[salesFunction]}</span>
                            <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-50 group-hover:opacity-100" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {(["vendedor", "gestor", "diretor", "ceo"] as SalesFunction[]).map((fn) => (
                            <DropdownMenuItem key={fn} onClick={() => setSalesFunctionOverride(fn)}
                              className={cn(salesFunction === fn && "bg-primary/10 text-primary font-medium")}>
                              {roleLabelMap[fn]}
                              {fn === realSalesFunction && <span className="ml-auto text-[10px] text-muted-foreground">atual</span>}
                            </DropdownMenuItem>
                          ))}
                          {isOverridden && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={clearOverride} className="text-muted-foreground">
                                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Voltar ao perfil real
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Mode Banner */}
            {isOverridden && !isCollapsed && (
              <div className="px-4 py-1.5 border-b border-sidebar-border bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400">Preview</span>
                  </div>
                  <button onClick={clearOverride} className="text-[10px] font-medium text-amber-400/70 hover:text-amber-300 underline">Sair</button>
                </div>
              </div>
            )}

            {/* ═══ Search filter ═══ */}
            {!isCollapsed && (
              <div className="px-3 py-2 border-b border-sidebar-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/30" />
                  <input
                    type="text"
                    value={menuFilter}
                    onChange={(e) => setMenuFilter(e.target.value)}
                    placeholder="Pesquisar menu... (⌘K)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-sidebar-accent/50 border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus:outline-none focus:ring-1 focus:ring-sidebar-primary/50"
                  />
                </div>
              </div>
            )}

            {/* ═══ BLOCK 2: Navigation ═══ */}
            <nav className={cn("flex-1 overflow-y-auto scrollbar-thin", isCollapsed ? "px-1 py-2" : "px-2 py-2")} aria-label="Navegação principal">
              <div className="space-y-0.5">
                {filteredSections.map((section, idx) => renderSection(section, idx))}
              </div>
            </nav>

            {/* ═══ BLOCK 3: Footer ═══ */}
            <div className={cn("border-t border-sidebar-border", isCollapsed ? "px-1 py-2" : "px-2 py-2")}>
              {/* Collapse toggle — desktop only, NOT for seniors */}
              {!isSenior && (
                <div className="hidden lg:block">
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={toggleCollapse}
                          className="flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                          aria-label="Expandir menu">
                          <PanelLeftOpen className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Expandir</TooltipContent>
                    </Tooltip>
                  ) : (
                    <button onClick={toggleCollapse}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 rounded-lg font-medium text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors",
                        style.itemHeight, style.textSize
                      )}
                      aria-label="Recolher menu">
                      <PanelLeftClose className={cn(style.iconSize, "shrink-0")} />
                      <span>Recolher</span>
                    </button>
                  )}
                </div>
              )}

              {/* ═══ IX-style footer extras (only when expanded) ═══ */}
              {!isCollapsed && (
                <div className="mt-2 pt-2 border-t border-sidebar-border/60 space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-sidebar-foreground/55">
                    <span>Prima</span>
                    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-sidebar-border bg-sidebar-accent text-[10px] font-semibold text-sidebar-foreground/70">
                      ?
                    </kbd>
                    <span>para ver os atalhos</span>
                  </div>
                  <IXThemeSwitcher />
                  <p className="text-[10px] leading-snug text-sidebar-foreground/40 text-center">
                    © {new Date().getFullYear()} FastCRM — Todos os direitos reservados
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
