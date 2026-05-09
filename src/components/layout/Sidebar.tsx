import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { PlanBadge } from "@/components/subscription/FeatureGate";
import {
  buildSidebarSections,
  type RouteEntry,
  type NavGroupMeta,
} from "@/config/routeManifest";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useAppMode } from "@/hooks/useAppMode";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { getExtensionObjectTabsGrouped } from "@/config/extensionRegistry";
import { useSidebarFavorites } from "@/hooks/useSidebarFavorites";
import { Settings as SettingsIcon, X, Puzzle, ChevronRight, Star, Command, Search } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { useUnreadInboxCount } from "@/hooks/useUnreadInboxCount";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type Section = NavGroupMeta & { items: RouteEntry[] };

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan } = useSubscription();
  const { installedModuleIds } = useWorkspaceModules();
  const { canAccessMenu } = useMenuPermissions();
  const { favorites, toggleFavorite, isFavorite } = useSidebarFavorites();
  const unreadInboxCount = useUnreadInboxCount();
  const badges = useSidebarBadges();
  const [navSearch, setNavSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // ── SSoT: build all sections from routeManifest ──
  const allSections: Section[] = useMemo(
    () => buildSidebarSections(installedModuleIds, canAccessMenu),
    [installedModuleIds, canAccessMenu]
  );

  // Split: "inicio" + "ai-strategy" → flat core items at top, rest → collapsible groups
  const coreSections = useMemo(
    () => allSections.filter((s) => s.key === "inicio" || s.key === "ai-strategy"),
    [allSections]
  );
  const groupedSections = useMemo(
    () => allSections.filter((s) => s.key !== "inicio" && s.key !== "ai-strategy"),
    [allSections]
  );

  const isActive = useCallback(
    (href: string, end?: boolean) => {
      const basePath = href.split("?")[0];
      if (end || basePath === "/dashboard") return location.pathname === basePath;
      return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
    },
    [location.pathname]
  );

  // Apply search filter
  const filteredCoreItems = useMemo(() => {
    const items = coreSections.flatMap((s) => s.items);
    if (!navSearch) return items;
    const q = navSearch.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [coreSections, navSearch]);

  const filteredGroups = useMemo(() => {
    if (!navSearch) return groupedSections;
    const q = navSearch.toLowerCase();
    return groupedSections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [groupedSections, navSearch]);

  const extensionGroups = useMemo(
    () => getExtensionObjectTabsGrouped(installedModuleIds),
    [installedModuleIds]
  );

  const sectionHasActive = useCallback(
    (items: RouteEntry[]) => items.some((i) => isActive(i.href, i.end)),
    [isActive]
  );

  const isGroupOpen = useCallback(
    (key: string, items: RouteEntry[]) => {
      if (navSearch) return true;
      if (openGroups[key] !== undefined) return openGroups[key];
      return sectionHasActive(items);
    },
    [openGroups, sectionHasActive, navSearch]
  );

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Flat list for favorites
  const allItems = useMemo(() => allSections.flatMap((s) => s.items), [allSections]);
  const favoriteItems = useMemo(
    () => favorites.map((href) => allItems.find((i) => i.href === href)).filter(Boolean) as RouteEntry[],
    [favorites, allItems]
  );

  const getBadgeCount = useCallback(
    (item: RouteEntry): number => {
      if (item.href === "/dashboard/inbox") return unreadInboxCount;
      if (item.badgeKey === "new_leads") return badges.pendingLeads;
      if (item.badgeKey === "activities_today") return badges.activitiesToday;
      if (item.badgeKey === "overdue_followups") return badges.overdueFollowups;
      if (item.badgeKey === "pending_decisions") return badges.pendingDecisions;
      if (item.href === "/dashboard/invoices") return badges.overdueInvoices;
      return 0;
    },
    [unreadInboxCount, badges]
  );

  // ── Render helpers ──

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const renderTag = (item: RouteEntry) => {
    if (item.isPro) return <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px] font-semibold border-amber-500/40 text-amber-500">Pro</Badge>;
    if (item.isBeta) return <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px] font-semibold border-blue-400/40 text-blue-400">Beta</Badge>;
    return null;
  };

  const renderLink = (item: RouteEntry, indent = false, showPinButton = false) => {
    const active = isActive(item.href, item.end);
    const Icon = item.icon;
    const badgeCount = getBadgeCount(item);
    const pinned = isFavorite(item.href);
    const hasTag = (item.isPro || item.isBeta) && badgeCount === 0;
    return (
      <Tooltip key={item.key}>
        <TooltipTrigger asChild>
          <div className="group/pin relative flex items-center">
            <Link
              to={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex-1",
                indent && "pl-9",
                active
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] shrink-0", active && "text-primary")} />
              <span className="truncate">{item.label}</span>
              {hasTag ? renderTag(item) : renderBadge(badgeCount)}
            </Link>
            {showPinButton && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(item.href); }}
                className={cn(
                  "absolute right-1 p-1 rounded transition-all",
                  pinned
                    ? "text-amber-400 opacity-100"
                    : "text-white/20 opacity-0 group-hover/pin:opacity-100 hover:text-amber-400"
                )}
                title={pinned ? t("removeFavorite") : t("addFavorite")}
              >
                <Star className={cn("w-3 h-3", pinned && "fill-amber-400")} />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: Section) => {
    if (!group.collapsible) {
      return (
        <div key={group.key} className="space-y-0.5">
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
              {group.label}
            </span>
          </div>
          {group.items.map((child) => renderLink(child, false, true))}
        </div>
      );
    }

    const groupOpen = isGroupOpen(group.key, group.items);
    const hasActive = sectionHasActive(group.items);
    const Icon = group.icon;

    return (
      <Collapsible
        key={group.key}
        open={groupOpen}
        onOpenChange={() => toggleGroup(group.key)}
      >
        <CollapsibleTrigger className="w-full">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
              hasActive
                ? "text-white/90"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <Icon className={cn("w-[18px] h-[18px] shrink-0", hasActive && "text-primary")} />
            <span className="truncate flex-1 text-left">{group.label}</span>
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-300 ease-out text-white/30",
                groupOpen && "rotate-90"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up space-y-0.5 mt-0.5">
          {group.items.map((child, idx) => (
            <div
              key={child.key}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
            >
              {renderLink(child, true, true)}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Static footer entry — Settings always available
  const settingsItem: RouteEntry = {
    key: "settings",
    label: t("settings", { defaultValue: "Definições" }),
    href: "/dashboard/settings",
    icon: SettingsIcon,
    group: "administracao",
    status: "active",
    visibleInSidebar: true,
    visibleInSearch: true,
  };

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {open && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0",
            "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950",
            "border-r border-white/5",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <WorkspaceLogo
                  logoUrl={currentWorkspace?.logo_url}
                  workspaceName={currentWorkspace?.name}
                  size="lg"
                  variant="sidebar"
                />
                <span className="font-bold text-white text-base truncate max-w-[140px] block">
                  {currentWorkspace?.name || "FastCRM"}
                </span>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspace switcher */}
            <div className="p-3 border-b border-white/5">
              <WorkspaceSwitcher />
            </div>

            {/* Plan badge */}
            <div className="px-3 py-2 border-b border-white/5">
              <PlanBadge
                plan={plan}
                className="w-full justify-center bg-white/5 text-white/80 border-white/10 text-xs"
              />
            </div>

            {/* Search bar */}
            <div className="px-3 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder={t("searchMenu")}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-3 pb-1">
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true })
                  );
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
              >
                <Command className="w-4 h-4" />
                <span className="flex-1 text-left">{t("quickActions")}</span>
                <kbd className="text-[10px] bg-white/10 rounded px-1.5 py-0.5 text-white/30">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Scrollable nav */}
            <nav
              className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto"
              style={{ colorScheme: "dark" }}
            >
              {/* Favorites */}
              {favoriteItems.length > 0 && !navSearch && (
                <div className="pb-2 mb-2">
                  <div className="flex items-center gap-2 px-3 pt-1 pb-1.5">
                    <Star className="w-3 h-3 text-amber-400/70" />
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                      {t("favorites")}
                    </span>
                  </div>
                  {favoriteItems.map((item) => renderLink(item))}
                </div>
              )}

              {/* Core items (Início + Estratégia IA, flat) */}
              {filteredCoreItems.length > 0 && (
                <div className="pb-2 mb-1">
                  {filteredCoreItems.map((item) => renderLink(item, false, true))}
                </div>
              )}

              {/* Collapsible groups */}
              <div className="space-y-0.5 pt-3 mt-3 border-t border-white/5">
                {filteredGroups.map((group) => renderGroup(group))}
              </div>

              {/* Extension groups */}
              {!navSearch && extensionGroups.length > 0 &&
                extensionGroups.map((group) => (
                  <div key={group.category}>
                    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
                      <Puzzle className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                        {group.category}
                      </span>
                    </div>
                    {group.tabs.map((extItem) => {
                      const active = isActive(extItem.route!);
                      const Icon = extItem.icon;
                      return (
                        <Tooltip key={extItem.key}>
                          <TooltipTrigger asChild>
                            <Link
                              to={extItem.route!}
                              onClick={onClose}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                                active
                                  ? "bg-primary/20 text-primary shadow-sm"
                                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-[18px] h-[18px]",
                                  active && "text-primary"
                                )}
                              />
                              <span>{extItem.label}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {extItem.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}

              {/* No results */}
              {navSearch && filteredCoreItems.length === 0 && filteredGroups.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-white/30">{t("noResults")}</p>
                </div>
              )}
            </nav>

            {/* Footer: Settings */}
            <div className="px-3 py-2 border-t border-white/5">
              {renderLink(settingsItem)}
            </div>

            {/* Role badge */}
            {currentWorkspace && (
              <div className="p-2 border-t border-white/5">
                <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-white/5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">
                    {tc("yourRole")}
                  </p>
                  <p className="text-sm font-medium text-white/90 capitalize">
                    {currentWorkspace.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
