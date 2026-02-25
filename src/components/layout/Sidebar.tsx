import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { PlanBadge } from "@/components/subscription/FeatureGate";
import { NAV_V2_ITEMS } from "@/config/nav.v2";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { getExtensionObjectTabsGrouped } from "@/config/extensionRegistry";
import { X, Puzzle } from "lucide-react";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// Map nav item names to i18n keys
const navNameKeys: Record<string, string> = {
  Home: "home", Objects: "objects", Inbox: "inbox", Ask: "ask",
  Automations: "automations", Intelligence: "intelligence", Revenue: "revenue",
  Reports: "reports", Marketplace: "marketplace", Settings: "settings",
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan } = useSubscription();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const { installedModuleIds } = useWorkspaceModules();

  const navItems = useMemo(() => {
    if (flagsLoading) return [...NAV_V2_ITEMS];
    return [...NAV_V2_ITEMS].filter((item) => {
      const flag_key = (item as any).featureFlag as string | undefined;
      if (!flag_key) return true;
      const flag = flags?.find((f) => f.flag_key === flag_key);
      return flag?.enabled ?? false;
    });
  }, [flags, flagsLoading]);

  const extensionGroups = useMemo(() => {
    return getExtensionObjectTabsGrouped(installedModuleIds);
  }, [installedModuleIds]);

  const isActive = (href: string, end?: boolean) => {
    const basePath = href.split("?")[0];
    if (end || basePath === "/dashboard") {
      return location.pathname === basePath;
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {open && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
        )}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950",
          "border-r border-white/5",
          open ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <WorkspaceLogo logoUrl={currentWorkspace?.logo_url} workspaceName={currentWorkspace?.name} size="lg" variant="sidebar" />
                <div><span className="font-bold text-white text-sm">FastCRM</span></div>
              </div>
              <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-white/5"><WorkspaceSwitcher /></div>
            <div className="px-3 py-2 border-b border-white/5">
              <PlanBadge plan={plan} className="w-full justify-center bg-white/5 text-white/80 border-white/10 text-xs" />
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto" style={{ colorScheme: "dark" }}>
              {navItems.map((item) => {
                const end = 'end' in item ? item.end : undefined;
                const active = isActive(item.href, end);
                const label = t(navNameKeys[item.name] || item.name.toLowerCase(), item.name);
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link to={item.href} onClick={onClose} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        active ? "bg-primary/20 text-primary shadow-sm" : "text-white/60 hover:bg-white/5 hover:text-white/90"
                      )}>
                        <item.icon className={cn("w-[18px] h-[18px]", active && "text-primary")} />
                        <span>{label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                  </Tooltip>
                );
              })}
              {extensionGroups.length > 0 && extensionGroups.map((group) => (
                <div key={group.category}>
                  <div className="flex items-center gap-2 px-3 pt-4 pb-1">
                    <Puzzle className="w-3 h-3 text-white/30" />
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{group.category}</span>
                  </div>
                  {group.tabs.map((extItem) => {
                    const active = isActive(extItem.route!);
                    const Icon = extItem.icon;
                    return (
                      <Tooltip key={extItem.key}>
                        <TooltipTrigger asChild>
                          <Link to={extItem.route!} onClick={onClose} className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            active ? "bg-primary/20 text-primary shadow-sm" : "text-white/60 hover:bg-white/5 hover:text-white/90"
                          )}>
                            <Icon className={cn("w-[18px] h-[18px]", active && "text-primary")} />
                            <span>{extItem.label}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">{extItem.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </nav>
            {currentWorkspace && (
              <div className="p-2 border-t border-white/5">
                <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-white/5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">{tc("yourRole")}</p>
                  <p className="text-sm font-medium text-white/90 capitalize">{currentWorkspace.role}</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
