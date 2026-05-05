import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { CalendarDays } from "lucide-react";

export default function LeadChefAgendaPage() {
  return (
    <LeadChefMobileShell title="Agenda" subtitle="Demonstrações, chamadas, follow-ups e visitas.">
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600">A agenda em lista será implementada na próxima fase.</p>
      </div>
    </LeadChefMobileShell>
  );
}
