import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface IXTabDef {
  id: string;
  label: string;
  count?: number;
}

interface IXEntityTabsProps {
  tabs: IXTabDef[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function IXEntityTabs({ tabs, activeId, onChange, className }: IXEntityTabsProps) {
  return (
    <div className={cn("border-b border-border bg-background px-4 sm:px-8", className)}>
      <div className="flex flex-wrap items-center gap-1 -mb-px">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant={active ? "default" : "secondary"} className="h-5 min-w-5 px-1.5 text-[11px] rounded-full">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
