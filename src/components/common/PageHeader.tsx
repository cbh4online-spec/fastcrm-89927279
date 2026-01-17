import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {typeof count === "number" && (
            <span className="text-sm text-muted-foreground">
              · {count.toLocaleString("pt-PT")} {count === 1 ? "registo" : "registos"}
            </span>
          )}
        </div>
        
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  action.variant === "outline"
                    ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    : action.variant === "ghost"
                    ? "hover:bg-accent hover:text-accent-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  action.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}

      {/* Tabs Navigation */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      {children}
    </div>
  );
}
