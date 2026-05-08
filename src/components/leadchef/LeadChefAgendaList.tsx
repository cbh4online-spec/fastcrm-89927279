import { LeadChefAgendaItemCard } from "./LeadChefAgendaItemCard";
import type { LeadChefAgendaGroup, LeadChefAppointment } from "@/types/leadchef";

interface Props {
  groups: LeadChefAgendaGroup[];
  onComplete?: (a: LeadChefAppointment) => void;
  onReschedule?: (a: LeadChefAppointment) => void;
  onCancel?: (a: LeadChefAppointment) => void;
}

export function LeadChefAgendaList({ groups, onComplete, onReschedule, onCancel }: Props) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.date}>
          <header className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{g.label}</h2>
            <span className="text-[11px] text-slate-400">{g.items.length} compromissos</span>
          </header>
          <div className="space-y-2">
            {g.items.map((a) => (
              <LeadChefAgendaItemCard
                key={a.id}
                appointment={a}
                onComplete={onComplete}
                onReschedule={onReschedule}
                onCancel={onCancel}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
