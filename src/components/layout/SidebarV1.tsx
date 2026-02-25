import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NAV_V1_ITEMS } from "@/config/nav.v1";
import { X, Command, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SidebarV1Props {
  open: boolean;
  onClose: () => void;
}

export function SidebarV1({ open, onClose }: SidebarV1Props) {
  const location = useLocation();
  const navigate = useNavigate();

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
          "bg-background border-r border-border",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header — Workspace Switcher */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-border">
            <div className="flex-1 min-w-0">
              <WorkspaceSwitcher />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-b border-border">
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
          </div>

          {/* Navigation — flat list with subtle separators */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            <div className="space-y-0.5">
              {NAV_V1_ITEMS.map((item) => {
                const active = isActive(item.href, item.end);
                return (
                  <div key={item.href}>
                    {item.separator && (
                      <Separator className="my-2" />
                    )}
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", active ? "text-foreground" : "text-muted-foreground")} />
                      <span>{item.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
