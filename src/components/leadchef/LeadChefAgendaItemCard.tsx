import { useNavigate } from "react-router-dom";
import { Phone, MessageSquare, ExternalLink, CheckCircle2, CalendarClock, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LeadChefAppointmentTypeBadge } from "./LeadChefAppointmentTypeBadge";
import { LeadChefAppointmentStatusBadge } from "./LeadChefAppointmentStatusBadge";
import { formatAgendaTime, isOverdue } from "@/utils/leadchef/date";
import { LeadChefICSExportButton } from "./LeadChefICSExportButton";
import type { LeadChefAppointment } from "@/types/leadchef";

interface Props {
  appointment: LeadChefAppointment;
  onComplete?: (a: LeadChefAppointment) => void;
  onReschedule?: (a: LeadChefAppointment) => void;
  onCancel?: (a: LeadChefAppointment) => void;
}

export function LeadChefAgendaItemCard({ appointment: a, onComplete, onReschedule, onCancel }: Props) {
  const navigate = useNavigate();
  const overdue = a.status === "scheduled" && isOverdue(a.scheduled_at);
  const completed = a.status === "completed";
  const cancelled = a.status === "cancelled";

  const phone = a.lead?.phone ?? null;
  const phoneClean = phone?.replace(/[^\d+]/g, "") ?? null;

  const goToLead = () => {
    if (a.lead_id) navigate(`/dashboard/leadchef/leads/${a.lead_id}`);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm p-4 transition-colors",
        overdue
          ? "bg-rose-50/60 border-rose-200"
          : completed
          ? "bg-slate-50/60 border-slate-200 opacity-80"
          : cancelled
          ? "bg-slate-50/40 border-slate-200 opacity-70"
          : "bg-white border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LeadChefAppointmentTypeBadge type={a.type} />
          {(overdue || completed || cancelled || a.status === "rescheduled") && (
            <LeadChefAppointmentStatusBadge status={overdue ? "overdue" : a.status} />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais opções"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {a.lead_id && (
              <DropdownMenuItem onClick={goToLead}>
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir lead
              </DropdownMenuItem>
            )}
            {!completed && !cancelled && (
              <>
                <DropdownMenuItem onClick={() => onComplete?.(a)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReschedule?.(a)}>
                  <CalendarClock className="h-4 w-4 mr-2" /> Reagendar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onCancel?.(a)} className="text-rose-600 focus:text-rose-600">
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className={cn("mt-2 text-sm font-semibold text-slate-900", completed && "line-through text-slate-500")}>
        {a.title}
      </h3>

      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{formatAgendaTime(a.scheduled_at)}</span>
        {a.duration_minutes ? <span>· {a.duration_minutes} min</span> : null}
        {a.is_online ? <span>· Online</span> : a.location ? <span>· {a.location}</span> : null}
      </div>

      {a.lead && (
        <button
          type="button"
          onClick={goToLead}
          className="mt-2 text-xs text-emerald-700 hover:underline font-medium"
        >
          {a.lead.name}
        </button>
      )}

      {a.notes && (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2 whitespace-pre-line">{a.notes}</p>
      )}

      {!completed && !cancelled && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {a.lead_id && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={goToLead}>
              <ExternalLink className="h-3 w-3 mr-1" /> Lead
            </Button>
          )}
          {phoneClean && (
            <>
              <a href={`tel:${phoneClean}`}>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <Phone className="h-3 w-3 mr-1" /> Ligar
                </Button>
              </a>
              <a
                href={`https://wa.me/${phoneClean.replace(/^\+/, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                </Button>
              </a>
            </>
          )}
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onComplete?.(a)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onReschedule?.(a)}>
            <CalendarClock className="h-3 w-3 mr-1" /> Reagendar
          </Button>
          <LeadChefICSExportButton appointment={a as any} />
        </div>
      )}
    </div>
  );
}
