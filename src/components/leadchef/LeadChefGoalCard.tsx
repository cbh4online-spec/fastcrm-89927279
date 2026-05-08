import { cn } from "@/lib/utils";
import { LeadChefGoalProgressBar } from "./LeadChefGoalProgressBar";
import { calculateGoalProgress, getGoalStatus, getGoalStatusTone } from "@/utils/leadchef/goals";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  current: number;
  goal: number;
  description?: string;
  className?: string;
}

export function LeadChefGoalCard({ icon: Icon, title, current, goal, description, className }: Props) {
  const pct = calculateGoalProgress(current, goal);
  const status = getGoalStatus(current, goal);
  const tone = getGoalStatusTone(status);
  const reached = status === "done";

  return (
    <div className={cn("rounded-2xl bg-white border p-4 shadow-sm", tone.border, className)}>
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", tone.bg, tone.text)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
            {reached && (
              <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Superado
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{current}</span>
            <span className="text-sm text-slate-500">de {goal || "—"}</span>
            {goal > 0 && (
              <span className={cn("ml-auto text-sm font-semibold", tone.text)}>{pct}%</span>
            )}
          </div>
          <LeadChefGoalProgressBar current={current} goal={goal} showLabel={false} className="mt-2" />
          {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
        </div>
      </div>
    </div>
  );
}
