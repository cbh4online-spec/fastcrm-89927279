import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowRight } from "lucide-react";

interface NexusQuickActionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose";
}

const colorMap = {
  primary: {
    icon: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
    border: "hover:border-primary/30",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
    border: "hover:border-emerald-500/30",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white",
    border: "hover:border-violet-500/30",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
    border: "hover:border-amber-500/30",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white",
    border: "hover:border-rose-500/30",
  },
};

export function NexusQuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  accentColor = "primary",
}: NexusQuickActionProps) {
  const colors = colorMap[accentColor];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer p-4 transition-all duration-200",
        "bg-card/80 backdrop-blur-sm border-border/50",
        "hover:shadow-md hover:shadow-black/5",
        colors.border
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl transition-colors", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Card>
  );
}

interface NexusQuickActionsGridProps {
  actions: NexusQuickActionProps[];
  className?: string;
}

export function NexusQuickActionsGrid({ actions, className }: NexusQuickActionsGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {actions.map((action, index) => (
        <NexusQuickAction key={index} {...action} />
      ))}
    </div>
  );
}
