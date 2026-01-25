import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderTab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface PageHeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  count?: number;
  tabs?: PageHeaderTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: PageHeaderAction[];
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  count,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h1>
          {typeof count === "number" && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-sm font-medium text-muted-foreground">
                {count.toLocaleString("pt-PT")} {count === 1 ? "registo" : "registos"}
              </span>
            </div>
          )}
        </div>
        
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                variant={action.variant === "outline" ? "outline" : action.variant === "ghost" ? "ghost" : "default"}
                className={cn(
                  "gap-2 transition-all duration-200",
                  action.variant !== "outline" && action.variant !== "ghost" && 
                  "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20"
                )}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}

      {/* Tabs Navigation - Nexus Style Pills */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
