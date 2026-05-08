import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getScoreColorClass, getScoreLabel } from "@/utils/leadchef/scoring";

interface Props {
  score?: number | null;
  isCold?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function LeadChefLeadScoreBadge({ score, isCold, size = "sm", className }: Props) {
  if (score == null) return null;
  const { label } = getScoreLabel(score);
  const colorClass = isCold
    ? "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
    : getScoreColorClass(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
      title={`Score ${score}/100 — ${label}${isCold ? " (frio)" : ""}`}
    >
      <Flame className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {score}
    </span>
  );
}
