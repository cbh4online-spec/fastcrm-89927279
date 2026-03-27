import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAdaptiveDashboard } from "@/hooks/useAdaptiveDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useSidebarAlerts } from "@/hooks/useSidebarAlerts";
import { useExtensionManifests } from "@/hooks/useExtensionManifests";
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
  AlertTriangle, Puzzle, Eye, ChevronDown, RotateCcw,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { SalesFunction } from "@/data/adaptiveDashboardMock";

interface AdaptiveSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
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
    collapsibleGroups: false,
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
      aria-label={`${count > 99 ? "mais de 99" : count} notificações`}
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

// ── Critical Alerts Section ──
function CriticalAlertsSection({ alerts }: { alerts: { id: string; message: string; severity: "danger" | "warning" }[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="px-4 py-3 border-b border-border bg-destructive/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-xs font-semibold uppercase tracking-wider text-destructive">Requer Atenção</span>
      </div>
      <ul className="space-y-1">
        {alerts.map((a) => (
          <li key={a.id} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", a.severity === "danger" ? "bg-destructive" : "bg-yellow-500")} />
            <span>{a.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdaptiveSidebar({ open, onClose, onOpen }: AdaptiveSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const { ageGroup, salesFunction, realSalesFunction, isOverridden, setSalesFunctionOverride, clearOverride } = useAdaptiveDashboard();
  const badges = useSidebarBadges();
  const criticalAlerts = useSidebarAlerts();
  const { extensionSettingsPages } = useExtensionManifests();
  const touchStartX = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const style = ageStyles[ageGroup];
  // Seniors: never collapse
  const isSenior = ageGroup === "senior";
  const isCollapsed = !isSenior && collapsed && !open;

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
      if (!style.collapsibleGroups) return true;
      if (openGroups[label] !== undefined) return openGroups[label];
      return sectionHasActive(section);
    },
    [openGroups, sectionHasActive, style.collapsibleGroups]
  );

  const toggleGroup = useCallback((name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // Real badge lookup
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

  // Touch swipe handling for closing
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
    let edgeStartX = 0;
    const handleEdgeStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 20 && !open) {
        edgeStartX = e.touches[0].clientX;
      } else {
        edgeStartX = -1;
      }
    };
    const handleEdgeEnd = (e: TouchEvent) => {
      if (edgeStartX >= 0 && edgeStartX < 20) {
        const deltaX = e.changedTouches[0].clientX - edgeStartX;
        if (deltaX > 50 && onOpen) {
          onOpen();
        }
      }
    };
    document.addEventListener("touchstart", handleEdgeStart, { passive: true });
    document.addEventListener("touchend", handleEdgeEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleEdgeStart);
      document.removeEventListener("touchend", handleEdgeEnd);
    };
  }, [open, onOpen]);

  // Keyboard shortcut: Cmd/Ctrl+B to toggle collapse
  useEffect(() => {
    if (isSenior) return; // no collapse for seniors
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapse, isSenior]);

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
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center p-2 rounded-lg transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        aria-current={active ? "page" : undefined}
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
    const hasActive = sectionHasActive(section);

    if (!section.collapsible || !style.collapsibleGroups) {
      return (
        <div key={section.label} className={cn(idx > 0 && "mt-2")} role="group" aria-label={section.label}>
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

    const groupOpen = isGroupOpen(section.label, section);
    return (
      <Collapsible
        key={section.label}
        open={groupOpen}
        onOpenChange={() => toggleGroup(section.label)}
        className={cn(idx > 0 && "mt-1")}
      >
        {!isCollapsed ? (
          <div role="group" aria-label={section.label}>
            <CollapsibleTrigger className="w-full" aria-expanded={groupOpen}>
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
                <section.icon className={cn(style.iconSize, "shrink-0", hasActive && "text-primary")} />
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
          </div>
        ) : (
          <>
            {idx > 0 && <div className="my-2 mx-1 border-t border-border/50" />}
            {section.items.map((item) => renderLink(item))}
          </>
        )}
      </Collapsible>
    );
  };

  // Marketplace modules section
  const hasExtensions = extensionSettingsPages.length > 0;

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
          role="navigation"
          aria-label="Menu principal"
          className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:translate-x-0",
            "bg-background border-r border-border",
            isSenior
              ? "w-[280px]"
              : isCollapsed ? "w-16" : "w-[280px] md:w-[240px] lg:w-[280px]",
            open ? "translate-x-0 w-[280px]" : "-translate-x-full",
            // Seniors: no animations
            isSenior && "[&_*]:!transition-none"
          )}
        >
          <div className="flex flex-col h-full">
            {/* ── Workspace Switcher ── */}
            <div className={cn(
              "border-b border-border",
              isCollapsed ? "px-1 py-2" : "px-3 py-2"
            )}>
              <WorkspaceSwitcher collapsed={isCollapsed} />
            </div>

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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                          {isOverridden && <Eye className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className="truncate">{roleLabelMap[salesFunction]}</span>
                          <ChevronDown className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {(["vendedor", "gestor", "diretor", "ceo"] as SalesFunction[]).map((fn) => (
                          <DropdownMenuItem
                            key={fn}
                            onClick={() => setSalesFunctionOverride(fn)}
                            className={cn(
                              salesFunction === fn && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            {roleLabelMap[fn]}
                            {fn === realSalesFunction && (
                              <span className="ml-auto text-[10px] text-muted-foreground">atual</span>
                            )}
                          </DropdownMenuItem>
                        ))}
                        {isOverridden && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={clearOverride} className="text-muted-foreground">
                              <RotateCcw className="w-3.5 h-3.5 mr-2" />
                              Voltar ao perfil real
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <button
                    onClick={onClose}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    aria-label="Fechar menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* ── Preview Mode Banner ── */}
            {isOverridden && !isCollapsed && (
              <div className="px-4 py-2 border-b border-border bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-semibold text-amber-700">Modo Preview</span>
                  </div>
                  <button
                    onClick={clearOverride}
                    className="text-[10px] font-medium text-amber-600 hover:text-amber-800 underline"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}

            {/* ── Gamification (< 35 anos) ── */}
            {ageGroup === "young" && !isCollapsed && <GamificationStrip />}

            {/* ── Quota Progress (Vendedores) ── */}
            {salesFunction === "vendedor" && !isCollapsed && (
              <QuotaProgressBar current={45000} target={65000} />
            )}

            {/* ── Critical Alerts ── */}
            {!isCollapsed && <CriticalAlertsSection alerts={criticalAlerts} />}

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
            )} aria-label="Navegação principal">
              <div className="space-y-0.5">
                {sections.map((section, idx) => renderSection(section, idx))}

                {/* ── Marketplace Modules ── */}
                {hasExtensions && !isCollapsed && (
                  <div className="mt-3" role="group" aria-label="Extensões">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Extensões
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {extensionSettingsPages.map((ext) => (
                        <Link
                          key={ext.key}
                          to={`/settings/${ext.key}`}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 rounded-lg font-medium transition-colors",
                            style.itemHeight,
                            style.textSize,
                            location.pathname.includes(ext.key)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                          )}
                          aria-current={location.pathname.includes(ext.key) ? "page" : undefined}
                        >
                          <Puzzle className={cn(style.iconSize, "shrink-0")} />
                          <span className="flex-1 truncate">{ext.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* ── Footer: Settings + Collapse ── */}
            <div className={cn("border-t border-border", isCollapsed ? "px-1 py-2" : "px-3 py-2")}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/settings"
                      onClick={onClose}
                      className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    style.textSize,
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  )}
                >
                  <Settings className={cn(style.iconSize, "shrink-0")} />
                  <span>Definições</span>
                </Link>
              )}

              {/* Collapse toggle — desktop only, NOT for seniors */}
              {!isSenior && (
                <div className="hidden lg:block mt-1">
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={toggleCollapse}
                          className="flex items-center justify-center w-full p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Expandir menu"
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
                        style.textSize,
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                      )}
                      aria-label="Recolher menu"
                    >
                      <PanelLeftClose className={cn(style.iconSize, "shrink-0")} />
                      <span>Recolher</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
