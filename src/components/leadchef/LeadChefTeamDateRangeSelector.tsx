import { cn } from "@/lib/utils";
import type { LeadChefPeriod } from "@/utils/leadchef/period";

const OPTIONS: { value: LeadChefPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

interface Props {
  value: LeadChefPeriod;
  onChange: (v: LeadChefPeriod) => void;
}

export function LeadChefTeamDateRangeSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full bg-white border border-slate-200 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition",
            value === o.value
              ? "bg-emerald-600 text-white"
              : "text-slate-700 hover:bg-slate-50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
