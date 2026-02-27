import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NAV_V1_ITEMS, NavV1Item } from "@/config/nav.v1";
import { X, Command, Search, Star, PanelLeftClose, PanelLeftOpen, Puzzle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSidebarFavorites } from "@/hooks/useSidebarFavorites";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { useCustomObjects } from "@/hooks/useCustomObjects";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { getExtensionObjectTabsGrouped } from "@/config/extensionRegistry";
import { getIconByName } from "@/lib/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarV1Props {
  open: boolean;
  onClose: () => void;
}

export function SidebarV1({ open, onClose }: SidebarV1Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useSidebarFavorites();
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const { data: customObjects } = useCustomObjects();
  const { installedModuleIds } = useWorkspaceModules();

  const extensionGroups = useMemo(() => {
    return getExtensionObjectTabsGrouped(installedModuleIds);
  }, [installedModuleIds]);

  // On mobile overlay, always show expanded
  const isCollapsed = collapsed && !open;

  const isActive = (href: string, end?: boolean) => {
    const basePath = href.split("?")[0];
    if (end || basePath === "/dashboard") {
      return location.pathname === basePath;
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  // Build dynamic nav items from custom objects — insert inline after CRM group
  const dynamicItems: NavV1Item[] = (customObjects || []).map((obj) => ({
    name: obj.name,
    href: `/objects/${obj.slug}`,
    icon: getIconByName(obj.icon),
    group: "CRM",
    dynamic: true,
  }));

  // Insert custom objects right after the CRM section items
  const crmEndIndex = NAV_V1_ITEMS.findIndex((item, i) => 
    item.group === "CRM" && (i + 1 >= NAV_V1_ITEMS.length || NAV_V1_ITEMS[i + 1].group !== "CRM")
  );
  const mergedNavItemsRaw = [
    ...NAV_V1_ITEMS.slice(0, crmEndIndex + 1),
    ...dynamicItems,
    ...NAV_V1_ITEMS.slice(crmEndIndex + 1),
  ];

  // Filter by installed modules and remove empty groups
  const visibleNavItems = useMemo(() => {
    // Filter items by moduleSlug
    const filtered = mergedNavItemsRaw.filter(
      (item) => !item.moduleSlug || installedModuleIds.includes(item.moduleSlug)
    );

    // Find groups that have no visible items (all items were filtered out)
    const groupItemCounts = new Map<string, number>();
    for (const item of filtered) {
      groupItemCounts.set(item.group, (groupItemCounts.get(item.group) || 0) + 1);
    }

    // Remove separator-only groups (groups where the only remaining item is just a separator header)
    // A group is empty if it has 0 items after filtering
    return filtered.filter((item) => {
      const count = groupItemCounts.get(item.group) || 0;
      return count > 0;
    });
  }, [mergedNavItemsRaw, installedModuleIds]);

  const favoriteItems = visibleNavItems.filter((item) => favorites.includes(item.href));

  return (
    <TooltipProvider delayDuration={0}>
      {open && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:translate-x-0",
          "bg-background border-r border-border",
          isCollapsed ? "w-14" : "w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header — Workspace Switcher */}
          <div className={cn(
            "flex items-center justify-between h-14 border-b border-border",
            isCollapsed ? "px-1" : "px-3"
          )}>
            <div className="flex-1 min-w-0">
              <WorkspaceSwitcher collapsed={isCollapsed} />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className={cn("border-b border-border", isCollapsed ? "px-1 py-2" : "px-3 py-2")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { navigate("/dashboard/ask"); onClose(); }}
                    className="flex items-center justify-center w-full p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Quick Actions</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => { navigate("/dashboard/ask"); onClose(); }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Quick Actions</span>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <Command className="w-3 h-3" />K
                </kbd>
              </button>
            )}
          </div>

          {/* Favoritos */}
          {favoriteItems.length > 0 && (
            <div className={cn("border-b border-border", isCollapsed ? "px-1 pt-2 pb-1" : "px-3 pt-3 pb-1")}>
              {!isCollapsed && (
                <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Favoritos
                </span>
              )}
              <div className={cn("space-y-0.5", !isCollapsed && "mt-1.5")}>
                {favoriteItems.map((item) => {
                  const active = isActive(item.href, 'end' in item ? item.end : undefined);
                  return isCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center justify-center p-2 rounded-lg transition-colors",
                            active
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.href} className="group flex items-center">
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", active ? "text-foreground" : "text-muted-foreground")} />
                        <span className="flex-1">{item.name}</span>
                        {item.moduleSlug && <Puzzle className="w-3 h-3 text-muted-foreground/50" />}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.href); }}
                          className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "px-1 py-2" : "px-3 py-2")}>
            <div className="space-y-0.5">
              {visibleNavItems.map((item) => {
                const active = isActive(item.href, item.end);
                const pinned = isFavorite(item.href);

                return (
                  <div key={item.href}>
                    {item.separator && <Separator className="my-2" />}
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center justify-center p-2 rounded-lg transition-colors",
                              active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}{item.moduleSlug && " (módulo)"}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="group flex items-center">
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex-1 flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4", active ? "text-foreground" : "text-muted-foreground")} />
                          <span className="flex-1">{item.name}</span>
                          {item.moduleSlug && <Puzzle className="w-3 h-3 text-muted-foreground/50" />}
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.href); }}
                            className={cn(
                              "p-0.5 rounded hover:bg-muted transition-all",
                              pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Star className={cn("w-3.5 h-3.5", pinned ? "fill-foreground text-foreground" : "text-muted-foreground")} />
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Extension modules grouped by category */}
            {extensionGroups.length > 0 && extensionGroups.map((group) => (
              <div key={group.category} className="mt-2">
                <Separator className="my-2" />
                {!isCollapsed && (
                  <div className="flex items-center gap-2 px-3 mb-1.5">
                    <Puzzle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.category}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.tabs.map((ext) => {
                    const active = isActive(ext.route!, false);
                    const Icon = ext.icon;
                    return isCollapsed ? (
                      <Tooltip key={ext.key}>
                        <TooltipTrigger asChild>
                          <Link
                            to={ext.route!}
                            onClick={onClose}
                            className={cn(
                              "flex items-center justify-center p-2 rounded-lg transition-colors",
                              active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{ext.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        key={ext.key}
                        to={ext.route!}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", active ? "text-foreground" : "text-muted-foreground")} />
                        <span>{ext.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Dynamic Records section removed — custom objects are now inline in CRM */}
          </nav>

          {/* Collapse Toggle — desktop only */}
          <div className={cn("hidden lg:block border-t border-border", isCollapsed ? "px-1 py-2" : "px-3 py-2")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleCollapse}
                    className="flex items-center justify-center w-full p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expandir</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={toggleCollapse}
                className="flex items-center gap-3 w-full px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
                <span>Recolher</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
