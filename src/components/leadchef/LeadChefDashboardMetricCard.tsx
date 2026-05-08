import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { LeadChefGoalProgressBar } from "./LeadChefGoalProgressBar";
import { calculateGoalProgress, getGoalStatus, getGoalStatusTone } from "@/utils/leadchef/goals";

interface Props {
  icon: LucideIcon;
  label: string;
  current: number;
  goal: number;
  hint?: string;
  className?: string;
}

export function LeadChefDashboardMetricCard({ icon: Icon, label, current, goal, hint, className }: Props) {
  const pct = calculateGoalProgress(current, goal);
  const status = getGoalStatus(current, goal);
  const tone = getGoalStatusTone(status);

  return (
    <div className={cn("rounded-2xl bg-white border border-slate-200 p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", tone.bg, tone.text)}>
          <Icon className="h-5 w-5" />
        </div>
        {goal > 0 && (
          <span className={cn("text-xs font-semibold", tone.text)}>{pct}%</span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5">
        {current}
        {goal > 0 && <span className="text-base font-medium text-slate-400 ml-1">/ {goal}</span>}
      </p>
      {goal > 0 && <LeadChefGoalProgressBar current={current} goal={goal} showLabel={false} className="mt-2" />}
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
