import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriorityScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function PriorityScoreBadge({ score, size = "sm", showLabel = false }: PriorityScoreBadgeProps) {
  const getColor = (s: number) => {
    if (s >= 75) return "bg-destructive/15 text-destructive border-destructive/30";
    if (s >= 40) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const getLabel = (s: number) => {
    if (s >= 75) return "Urgente";
    if (s >= 40) return "Atenção";
    return "Normal";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md border font-semibold tabular-nums",
            getColor(score),
            size === "sm" ? "text-[10px] px-1.5 py-0 h-5 min-w-[28px]" : "text-xs px-2 py-0.5"
          )}
        >
          {score}
          {showLabel && <span className="ml-1 font-normal">{getLabel(score)}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Priority Score: {score}/100 — {getLabel(score)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
