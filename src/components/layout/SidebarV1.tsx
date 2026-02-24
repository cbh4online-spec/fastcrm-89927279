import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { PlanBadge } from "@/components/subscription/FeatureGate";
import { getNavV1Groups } from "@/config/nav.v1";
import { X } from "lucide-react";

interface SidebarV1Props {
  open: boolean;
  onClose: () => void;
}

const groups = getNavV1Groups();

export function SidebarV1({ open, onClose }: SidebarV1Props) {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { plan } = useSubscription();

  const isActive = (href: string, end?: boolean) => {
    const basePath = href.split("?")[0];
    if (end || basePath === "/dashboard") {
      return location.pathname === basePath;
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  return (
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
              <div>
                <span className="font-bold text-white text-sm">FastCRM</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="p-3 border-b border-white/5">
            <WorkspaceSwitcher />
          </div>

          {/* Plan Badge */}
          <div className="px-3 py-2 border-b border-white/5">
            <PlanBadge plan={plan} className="w-full justify-center bg-white/5 text-white/80 border-white/10 text-xs" />
          </div>

          {/* Navigation with groups */}
          <nav className="flex-1 p-3 overflow-y-auto" style={{ colorScheme: "dark" }}>
            {groups.map(({ group, items }) => (
              <div key={group} className="mb-4">
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item.href, item.end);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-primary/20 text-primary shadow-sm"
                            : "text-white/60 hover:bg-white/5 hover:text-white/90"
                        )}
                      >
                        <item.icon className={cn("w-[18px] h-[18px]", active && "text-primary")} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Role indicator */}
          {currentWorkspace && (
            <div className="p-2 border-t border-white/5">
              <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">O seu cargo</p>
                <p className="text-sm font-medium text-white/90 capitalize">
                  {currentWorkspace.role}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
