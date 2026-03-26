import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAdaptiveDashboard } from "@/hooks/useAdaptiveDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import {
  getAdaptiveSections,
  getQuickActions,
  mockGamification,
  type AdaptiveNavSection,
  type AdaptiveNavItem,
} from "@/config/nav.adaptive";
import type { AgeGroup } from "@/data/adaptiveDashboardMock";
import {
  X, PanelLeftClose, PanelLeftOpen, ChevronRight,
  Settings, Flame, Medal, TrendingUp,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface AdaptiveSidebarProps {
  open: boolean;
  onClose: () => void;
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
  young: {
    iconSize: "w-5 h-5",
    textSize: "text-sm",
    itemHeight: "py-2.5",
    animationsEnabled: true,
    collapsibleGroups: true,
  },
  standard: {
    iconSize: "w-5 h-5",
    textSize: "text-sm",
    itemHeight: "py-2",
    animationsEnabled: true,
    collapsibleGroups: true,
  },
  senior: {
    iconSize: "w-6 h-6",
    textSize: "text-lg",
    itemHeight: "py-3",
    animationsEnabled: false,
    collapsibleGroups: false, // always expanded
  },
};

// ── Badge Component ──
function SidebarBadge({ count, animate }: { count: number; animate?: boolean }) {
  if (count <= 0) return null;

  const color =
    count > 5 ? "bg-destructive text-destructive-foreground" :
    count >= 3 ? "bg-yellow-500 text-white" :
    "bg-blue-500 text-white";

  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        color,
        animate && count > 5 && "animate-pulse"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Quota Progress Bar ──
function QuotaProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const color =
    pct >= 90 ? "bg-emerald-500" :
    pct >= 71 ? "bg-yellow-500" :
    "bg-destructive";

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">Quota Mensal</span>
        <span className={cn("text-xs font-bold", pct >= 90 ? "text-emerald-600" : pct >= 71 ? "text-yellow-600" : "text-destructive")}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">€{(current / 1000).toFixed(1)}k</span>
        <span className="text-[10px] text-muted-foreground">€{(target / 1000).toFixed(1)}k</span>
      </div>
    </div>
  );
}

// ── Gamification Strip ──
function GamificationStrip() {
  const g = mockGamification;
  return (
    <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-600">{g.streak}d</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-600">Nv.{g.level}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600">#{g.position}</span>
        </div>
      </div>
      <div className="mt-1.5">
        <Progress value={(g.xp / g.xpToNext) * 100} className="h-1.5" />
      </div>
    </div>
  );
}

export function AdaptiveSidebar({ open, onClose }: AdaptiveSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const { ageGroup, salesFunction, layoutConfig } = useAdaptiveDashboard();
  const badges = useSidebarBadges();
  const touchStartX = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const style = ageStyles[ageGroup];
  const isCollapsed = collapsed && !open;

  const sections = useMemo(() => {
    const age = ageGroup === "young" ? 25 : ageGroup === "senior" ? 55 : 40;
    return getAdaptiveSections(salesFunction).filter((s) => {
      if (s.minAge && age < s.minAge) return false;
      if (s.maxAge && age > s.maxAge) return false;
      return true;
    });
  }, [salesFunction, ageGroup]);

  const quickActions = useMemo(() => getQuickActions(salesFunction), [salesFunction]);

  // Collapsible group state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (href: string, end?: boolean) => {
      const basePath = href.split("?")[0];
      if (end || basePath === "/dashboard") return location.pathname === basePath;
      return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
    },
    [location.pathname]
  );

  const sectionHasActive = useCallback(
    (section: AdaptiveNavSection) => section.items.some((i) => isActive(i.href, i.end)),
    [isActive]
  );

  const isGroupOpen = useCallback(
    (label: string, section: AdaptiveNavSection) => {
      if (!style.collapsibleGroups) return true; // seniors: always open
      if (openGroups[label] !== undefined) return openGroups[label];
      return sectionHasActive(section);
    },
    [openGroups, sectionHasActive, style.collapsibleGroups]
  );

  const toggleGroup = useCallback((name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // Badge mock lookup
  const getBadge = useCallback(
    (badgeKey?: string): number => {
      if (!badgeKey) return 0;
      if (badgeKey === "new_leads") return badges.pendingLeads;
      if (badgeKey === "pending_decisions") return 3; // mock
      if (badgeKey === "activities_today") return 5; // mock
      return 0;
    },
    [badges]
  );

  // Touch swipe handling
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (open && deltaX < -50) onClose();
    };
    const el = sidebarRef.current;
    if (el) {
      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchend", handleTouchEnd, { passive: true });
      return () => {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [open, onClose]);

  // Swipe from left edge to open
  useEffect(() => {
    const handleEdgeSwipe = (e: TouchEvent) => {
      if (e.touches[0].clientX < 20 && !open) {
        touchStartX.current = e.touches[0].clientX;
      }
    };
    const handleEdgeEnd = (e: TouchEvent) => {
      if (touchStartX.current < 20) {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > 50) {
          // We can't "open" from here without a callback, but the hamburger handles it
        }
      }
    };
    document.addEventListener("touchstart", handleEdgeSwipe, { passive: true });
    document.addEventListener("touchend", handleEdgeEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleEdgeSwipe);
      document.removeEventListener("touchend", handleEdgeEnd);
    };
  }, [open]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilizador";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const roleLabelMap: Record<string, string> = {
    vendedor: "Vendedor",
    gestor: "Gestor de Vendas",
    diretor: "Diretor Comercial",
    ceo: "CEO / Founder",
  };

  // ── Render Link ──
  const renderLink = (item: AdaptiveNavItem, indent = false) => {
    const active = isActive(item.href, item.end);
    const Icon = item.icon;
    const badgeCount = getBadge(item.badgeKey);

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link
              to={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn(style.iconSize, active && "text-primary")} />
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-3 rounded-lg font-medium transition-colors",
          style.itemHeight,
          style.textSize,
          indent && "pl-10",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        )}
      >
        <Icon className={cn(style.iconSize, "shrink-0", active && "text-primary")} />
        <span className="flex-1 truncate">{item.name}</span>
        <SidebarBadge count={badgeCount} animate={style.animationsEnabled} />
      </Link>
    );
  };

  // ── Render Section ──
  const renderSection = (section: AdaptiveNavSection, idx: number) => {
    const Icon = section.icon;
    const hasActive = sectionHasActive(section);

    // Non-collapsible (senior or non-collapsible sections)
    if (!section.collapsible || !style.collapsibleGroups) {
      return (
        <div key={section.label} className={cn(idx > 0 && "mt-2")}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
              <span className={cn(
                "text-[11px] font-semibold uppercase tracking-wider",
                hasActive ? "text-primary/70" : "text-muted-foreground/60"
              )}>
                {section.label}
              </span>
            </div>
          )}
          {isCollapsed && idx > 0 && <div className="my-2 mx-1 border-t border-border/50" />}
          <div className="space-y-0.5">
            {section.items.map((item) => renderLink(item))}
          </div>
        </div>
      );
    }

    // Collapsible group
    const groupOpen = isGroupOpen(section.label, section);
    return (
      <Collapsible
        key={section.label}
        open={groupOpen}
        onOpenChange={() => toggleGroup(section.label)}
        className={cn(idx > 0 && "mt-1")}
      >
        {!isCollapsed ? (
          <>
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 rounded-lg font-medium cursor-pointer transition-colors",
                  style.itemHeight,
                  style.textSize,
                  hasActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn(style.iconSize, "shrink-0", hasActive && "text-primary")} />
                <span className="flex-1 text-left truncate">{section.label}</span>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground/50 transition-transform duration-200",
                    groupOpen && "rotate-90"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 mt-0.5">
              {section.items.map((item) => renderLink(item, true))}
            </CollapsibleContent>
          </>
        ) : (
          <>
            {idx > 0 && <div className="my-2 mx-1 border-t border-border/50" />}
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
        {open && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}

        <aside
          ref={sidebarRef}
          className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:translate-x-0",
            "bg-background border-r border-border",
            isCollapsed ? "w-16" : "w-[280px] md:w-[240px] lg:w-[280px]",
            open ? "translate-x-0 w-[280px]" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* ── Header: User Profile ── */}
            <div className={cn(
              "flex items-center border-b border-border",
              isCollapsed ? "justify-center py-3 px-1" : "gap-3 px-4 py-3"
            )}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 cursor-default">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabelMap[salesFunction]}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate text-foreground", style.textSize === "text-lg" ? "text-base" : "text-sm")}>
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {roleLabelMap[salesFunction]}
                    </p>
                    {currentWorkspace && (
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {currentWorkspace.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* ── Gamification (< 35 anos) ── */}
            {ageGroup === "young" && !isCollapsed && <GamificationStrip />}

            {/* ── Quota Progress (Vendedores) ── */}
            {salesFunction === "vendedor" && !isCollapsed && (
              <QuotaProgressBar current={45000} target={65000} />
            )}

            {/* ── Quick Actions (< 40 anos) ── */}
            {ageGroup !== "senior" && !isCollapsed && (
              <div className="flex gap-1.5 px-4 py-2 border-b border-border">
                {quickActions.map((qa) => (
                  <Link
                    key={qa.href}
                    to={qa.href}
                    onClick={onClose}
                    className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <qa.icon className={cn("w-4 h-4", qa.color)} />
                    <span className="text-[10px] font-medium text-muted-foreground">{qa.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* ── Navigation Sections ── */}
            <nav className={cn(
              "flex-1 overflow-y-auto",
              isCollapsed ? "px-1 py-2" : "px-3 py-2"
            )}>
              <div className="space-y-0.5">
                {sections.map((section, idx) => renderSection(section, idx))}
              </div>
            </nav>

            {/* ── Footer: Settings + Collapse ── */}
            <div className={cn("border-t border-border", isCollapsed ? "px-1 py-2" : "px-3 py-2")}>
              {/* Settings link */}
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/settings"
                      onClick={onClose}
                      className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Settings className={style.iconSize} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Definições</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/settings"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 rounded-lg font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                    style.itemHeight,
                    style.textSize
                  )}
                >
                  <Settings className={cn(style.iconSize, "shrink-0")} />
                  <span>Definições</span>
                </Link>
              )}

              {/* Collapse toggle — desktop only */}
              <div className="hidden lg:block mt-1">
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
                    className={cn(
                      "flex items-center gap-3 w-full px-3 rounded-lg font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                      style.itemHeight,
                      style.textSize
                    )}
                  >
                    <PanelLeftClose className={cn(style.iconSize, "shrink-0")} />
                    <span>Recolher</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
