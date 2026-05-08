import { cn } from "@/lib/utils";
import { LEADCHEF_APPOINTMENT_TYPE_LABELS } from "./constants";
import type { LeadChefAgendaPeriod, LeadChefAppointmentType } from "@/types/leadchef";

const PERIOD_OPTIONS: { value: LeadChefAgendaPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "overdue", label: "Em atraso" },
  { value: "all", label: "Todos" },
];

const TYPE_FILTER_OPTIONS: { value: LeadChefAppointmentType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "phone_call", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.phone_call },
  { value: "whatsapp", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.whatsapp },
  { value: "follow_up", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.follow_up },
  { value: "demo", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.demo },
  { value: "post_sale_visit", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.post_sale_visit },
  { value: "cooking_class", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.cooking_class },
  { value: "proposal", label: LEADCHEF_APPOINTMENT_TYPE_LABELS.proposal },
];

interface Props {
  period: LeadChefAgendaPeriod;
  onPeriodChange: (p: LeadChefAgendaPeriod) => void;
  type: LeadChefAppointmentType | "all";
  onTypeChange: (t: LeadChefAppointmentType | "all") => void;
  counters?: { today: number; week: number; month: number; overdue: number };
}

function Pill({
  active,
  children,
  onClick,
  count,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap",
        active
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span className={cn("ml-1.5", active ? "opacity-90" : "text-slate-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

export function LeadChefAgendaFilters({
  period,
  onPeriodChange,
  type,
  onTypeChange,
  counters,
}: Props) {
  const countFor = (p: LeadChefAgendaPeriod): number | undefined => {
    if (!counters) return undefined;
    if (p === "today") return counters.today;
    if (p === "week") return counters.week;
    if (p === "month") return counters.month;
    if (p === "overdue") return counters.overdue;
    return undefined;
  };

  return (
    <div className="space-y-2">
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 pb-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              active={period === opt.value}
              onClick={() => onPeriodChange(opt.value)}
              count={countFor(opt.value)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 pb-1">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              active={type === opt.value}
              onClick={() => onTypeChange(opt.value)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
