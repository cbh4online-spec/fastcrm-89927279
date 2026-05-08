import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadChefAppointmentTypeBadge } from "./LeadChefAppointmentTypeBadge";
import { LeadChefAppointmentStatusBadge } from "./LeadChefAppointmentStatusBadge";
import { LeadChefCreateAppointmentSheet } from "./LeadChefCreateAppointmentSheet";
import { useLeadChefAgenda } from "@/hooks/leadchef/useLeadChefAgenda";
import { formatAgendaDate, formatAgendaTime, isOverdue } from "@/utils/leadchef/date";

interface Props {
  leadId: string;
  profileId: string;
}

export function LeadChefLeadAppointmentsSection({ leadId, profileId }: Props) {
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useLeadChefAgenda({ period: "all", leadId });

  const upcoming = data
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Compromissos</h2>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(true)}>
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Marcar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-3">Sem compromissos marcados.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((a) => {
            const status = a.status === "scheduled" && isOverdue(a.scheduled_at) ? "overdue" : a.status;
            return (
              <li key={a.id} className="flex items-start justify-between gap-2 text-xs border border-slate-100 rounded-xl px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <LeadChefAppointmentTypeBadge type={a.type} className="text-[10px] py-0" />
                    <LeadChefAppointmentStatusBadge status={status} className="text-[10px] py-0" />
                  </div>
                  <p className="font-medium text-slate-900 truncate">{a.title}</p>
                  <p className="text-slate-500 mt-0.5">
                    {formatAgendaDate(a.scheduled_at)} · {formatAgendaTime(a.scheduled_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <LeadChefCreateAppointmentSheet
        open={open}
        onOpenChange={setOpen}
        leadId={leadId}
        profileId={profileId}
      />
    </div>
  );
}
