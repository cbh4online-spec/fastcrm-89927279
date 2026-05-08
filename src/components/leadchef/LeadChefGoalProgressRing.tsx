import { cn } from "@/lib/utils";
import { calculateGoalProgress, getGoalStatus, getGoalStatusTone } from "@/utils/leadchef/goals";

interface Props {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function LeadChefGoalProgressRing({
  current,
  goal,
  size = 96,
  strokeWidth = 10,
  className,
  label,
}: Props) {
  const pct = calculateGoalProgress(current, goal);
  const capped = Math.min(100, pct);
  const status = getGoalStatus(current, goal);
  const tone = getGoalStatusTone(status);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-100"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={tone.ring}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xl font-bold", tone.text)}>{goal > 0 ? `${pct}%` : "—"}</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
