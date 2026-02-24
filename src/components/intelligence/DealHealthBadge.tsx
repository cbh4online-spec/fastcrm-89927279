import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DealIntelligence, HealthLabel } from "@/hooks/useDealIntelligence";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";

const config: Record<HealthLabel, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "Healthy", className: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  watch: { label: "Watch", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Eye },
  at_risk: { label: "At Risk", className: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
};

interface DealHealthBadgeProps {
  intelligence: DealIntelligence | undefined;
}

export function DealHealthBadge({ intelligence }: DealHealthBadgeProps) {
  if (!intelligence) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const c = config[intelligence.healthLabel];
  const Icon = c.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold cursor-default", c.className)}>
          <Icon className="w-3 h-3 mr-1" />
          {c.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[200px]">
        <p className="text-xs font-medium">{intelligence.healthScore}/100</p>
        {intelligence.topRiskReason && (
          <p className="text-xs text-muted-foreground mt-0.5">{intelligence.topRiskReason}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
