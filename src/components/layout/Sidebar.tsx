import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { PlanBadge } from "@/components/subscription/FeatureGate";
import {
  getNavV2Core,
  getNavV2Groups,
  getNavV2Footer,
  NavV2CoreItem,
  NavV2Group,
  NavV2GroupChild,
} from "@/config/nav.v2";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { getExtensionObjectTabsGrouped } from "@/config/extensionRegistry";
import { useSidebarFavorites } from "@/hooks/useSidebarFavorites";
import { X, Puzzle, ChevronRight, Star, Command, Search } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { useUnreadInboxCount } from "@/hooks/useUnreadInboxCount";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
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

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan } = useSubscription();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const { installedModuleIds } = useWorkspaceModules();
  const { favorites, toggleFavorite, isFavorite } = useSidebarFavorites();
  const unreadInboxCount = useUnreadInboxCount();
  const badges = useSidebarBadges();
  const [navSearch, setNavSearch] = useState("");

  // Translated nav items
  const navCore = useMemo(() => getNavV2Core(t), [t]);
  const navGroups = useMemo(() => getNavV2Groups(t), [t]);
  const navFooter = useMemo(() => getNavV2Footer(t), [t]);

  // Collapsible group state — auto-open group containing active route
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (href: string, end?: boolean) => {
      const basePath = href.split("?")[0];
      if (end || basePath === "/dashboard") return location.pathname === basePath;
      return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
    },
    [location.pathname]
  );

  const isFlagEnabled = useCallback(
    (flag?: string) => {
      if (!flag) return true;
      if (flagsLoading) return true;
      return flags?.find((f) => f.flag_key === flag)?.enabled ?? false;
    },
    [flags, flagsLoading]
  );

  const isModuleVisible = useCallback(
    (moduleSlug?: string) => {
      if (!moduleSlug) return true;
      return installedModuleIds.includes(moduleSlug);
    },
    [installedModuleIds]
  );

  const filteredGroups = useMemo(() => {
    return navGroups
      .filter((g) => isFlagEnabled(g.featureFlag))
      .map((g) => {
        const groupHasSlug = !!g.moduleSlug;
        const groupVisible = groupHasSlug ? installedModuleIds.includes(g.moduleSlug!) : true;

        if (groupHasSlug && !groupVisible) return null;

        let visibleChildren = g.children.filter((c) => {
          if (!isFlagEnabled(c.featureFlag)) return false;
          if (groupHasSlug) return true;
          return c.moduleSlug ? installedModuleIds.includes(c.moduleSlug) : true;
        });

        // Apply nav search filter
        if (navSearch) {
          const lower = navSearch.toLowerCase();
          visibleChildren = visibleChildren.filter((c) =>
            c.name.toLowerCase().includes(lower)
          );
        }

        if (visibleChildren.length === 0) return null;
        return { ...g, children: visibleChildren };
      })
      .filter(Boolean) as (NavV2Group & { children: NavV2GroupChild[] })[];
  }, [isFlagEnabled, installedModuleIds, navGroups, navSearch]);

  // Filter core items by search
  const filteredCore = useMemo(() => {
    if (!navSearch) return navCore;
    const lower = navSearch.toLowerCase();
    return navCore.filter((item) => item.name.toLowerCase().includes(lower));
  }, [navCore, navSearch]);

  const extensionGroups = useMemo(() => {
    return getExtensionObjectTabsGrouped(installedModuleIds);
  }, [installedModuleIds]);

  // Compute which groups should be auto-opened (contain active route)
  const groupHasActiveRoute = useCallback(
    (group: NavV2Group) =>
      group.children.some((c) => isActive(c.href)),
    [isActive]
  );

  const isGroupOpen = useCallback(
    (groupName: string, group: NavV2Group) => {
      // When searching, auto-open all groups
      if (navSearch) return true;
      if (openGroups[groupName] !== undefined) return openGroups[groupName];
      return groupHasActiveRoute(group);
    },
    [openGroups, groupHasActiveRoute, navSearch]
  );

  const toggleGroup = useCallback((name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // All favoritable items (flat list)
  const allItems = useMemo(() => {
    const items: NavV2GroupChild[] = [];
    navCore.forEach((i) => items.push({ name: i.name, href: i.href, icon: i.icon }));
    navGroups.forEach((g) => g.children.forEach((c) => items.push(c)));
    return items;
  }, [navCore, navGroups]);

  const favoriteItems = useMemo(
    () => favorites.map((href) => allItems.find((i) => i.href === href)).filter(Boolean) as NavV2GroupChild[],
    [favorites, allItems]
  );

  // Badge lookup
  const getBadgeCount = useCallback((href: string): number => {
    if (href === "/dashboard/inbox") return unreadInboxCount;
    if (href === "/dashboard/leads") return badges.pendingLeads;
    if (href === "/dashboard/invoices") return badges.overdueInvoices;
    return 0;
  }, [unreadInboxCount, badges]);

  // --- Render helpers ---

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const renderLink = (item: { name: string; href: string; icon: any; iconColor?: string; badgeKey?: string }, end?: boolean, indent = false, showPinButton = false) => {
    const active = isActive(item.href, end);
    const Icon = item.icon;
    const badgeCount = getBadgeCount(item.href);
    const pinned = isFavorite(item.href);
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <div className="group/pin relative flex items-center">
            <Link
              to={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex-1",
                indent && "pl-9",
                active
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-primary" : item.iconColor)} />
              <span className="truncate">{item.name}</span>
              {renderBadge(badgeCount)}
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
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: NavV2Group & { children: NavV2GroupChild[] }) => {
    const groupOpen = isGroupOpen(group.name, group as any);
    const hasActive = groupHasActiveRoute(group as any);
    const Icon = group.icon;

    return (
      <Collapsible
        key={group.name}
        open={groupOpen}
        onOpenChange={() => toggleGroup(group.name)}
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
            <Icon className={cn("w-[18px] h-[18px] shrink-0", hasActive ? "text-primary" : group.iconColor)} />
            <span className="truncate flex-1 text-left">{group.name}</span>
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200 text-white/30",
                groupOpen && "rotate-90"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {group.children.map((child) => renderLink(child, false, true, true))}
        </CollapsibleContent>
      </Collapsible>
    );
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

              {/* Core items */}
              <div className="pb-2 mb-1">
                {filteredCore.map((item) => renderLink(item, item.end))}
              </div>

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
              {navSearch && filteredCore.length === 0 && filteredGroups.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-white/30">{t("noResults")}</p>
                </div>
              )}
            </nav>

            {/* Footer: Settings */}
            <div className="px-3 py-2 border-t border-white/5">
              {renderLink(navFooter)}
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
