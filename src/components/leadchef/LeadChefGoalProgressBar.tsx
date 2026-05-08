import { cn } from "@/lib/utils";
import { calculateGoalProgress, getGoalStatus, getGoalStatusColor } from "@/utils/leadchef/goals";

interface Props {
  current: number;
  goal: number;
  className?: string;
  showLabel?: boolean;
}

export function LeadChefGoalProgressBar({ current, goal, className, showLabel = true }: Props) {
  const pct = calculateGoalProgress(current, goal);
  const capped = Math.min(100, pct);
  const status = getGoalStatus(current, goal);
  const color = getGoalStatusColor(status);

  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${capped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-slate-500">
            {goal > 0 ? `${current} / ${goal}` : `${current}`}
          </span>
          <span className="text-xs font-medium text-slate-700">
            {goal > 0 ? `${pct}%` : "Sem objetivo"}
          </span>
        </div>
      )}
    </div>
  );
}
