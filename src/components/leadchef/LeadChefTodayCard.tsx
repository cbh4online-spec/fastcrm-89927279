import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "emerald" | "slate" | "amber" | "sky";
  className?: string;
  to?: string;
}

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-50 text-amber-700",
  sky: "bg-sky-50 text-sky-700",
};

export function LeadChefTodayCard({ icon: Icon, label, value, hint, tone = "emerald", className, to }: Props) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    </>
  );

  const baseCls = cn(
    "rounded-2xl bg-white border border-slate-200 p-4 shadow-sm",
    to && "block transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 active:bg-emerald-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={baseCls} aria-label={label}>
        {content}
      </Link>
    );
  }

  return <div className={baseCls}>{content}</div>;
}
