import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const TONES = {
  default: "text-slate-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

export function LeadChefTeamMetricCard({ label, value, icon: Icon, hint, tone = "default" }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-emerald-600" />}
      </div>
      <p className={cn("text-2xl font-bold mt-1", TONES[tone])}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}
