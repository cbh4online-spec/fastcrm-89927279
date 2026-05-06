import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MoreVertical,
  Phone,
  Send,
  Video,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWhatsAppAppointments,
  useUpdateAppointmentStatus,
  type AppointmentType,
  type WhatsAppAppointment,
} from "@/hooks/useWhatsAppAppointments";
import { useProcessPendingReminders } from "@/hooks/useWhatsAppReminders";
import { useNavigate } from "react-router-dom";

const TYPE_LABEL: Record<AppointmentType, string> = {
  phone_call: "Chamada",
  whatsapp_call: "Chamada WhatsApp",
  whatsapp_video_call: "Vídeo WhatsApp",
  online_meeting: "Reunião online",
  in_person_meeting: "Reunião presencial",
  demo: "Demonstração",
  consultation: "Consulta",
  support: "Suporte",
  sales_followup: "Follow-up",
  proposal_review: "Proposta",
  other: "Outro",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  confirmed: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  completed: { label: "Concluído", className: "bg-slate-500/10 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelado", className: "bg-rose-500/10 text-rose-700 border-rose-200" },
  no_show: { label: "Não compareceu", className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  rescheduled: { label: "Reagendado", className: "bg-purple-500/10 text-purple-700 border-purple-200" },
};

function typeIcon(t: string) {
  if (t === "phone_call" || t === "whatsapp_call") return Phone;
  if (t === "whatsapp_video_call" || t === "online_meeting") return Video;
  return CalendarClock;
}

interface Props {
  conversationId?: string | null;
  defaultFilter?: "upcoming" | "today" | "overdue" | "completed" | "all";
  onOpenConversation?: (conversationId: string) => void;
}

export function WhatsAppAppointmentsSection({
  conversationId,
  defaultFilter = "upcoming",
  onOpenConversation,
}: Props) {
  const [filter, setFilter] = useState<typeof defaultFilter>(defaultFilter);
  const navigate = useNavigate();

  const filterParams = (() => {
    const now = new Date().toISOString();
    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        status: ["scheduled", "confirmed", "rescheduled"] as const,
      };
    }
    if (filter === "overdue") {
      return {
        to: now,
        status: ["scheduled", "confirmed", "rescheduled"] as const,
      };
    }
    if (filter === "completed") {
      return { status: ["completed", "cancelled", "no_show"] as const };
    }
    if (filter === "upcoming") {
      return {
        from: now,
        status: ["scheduled", "confirmed", "rescheduled"] as const,
      };
    }
    return {};
  })();

  const { data: appointments = [], isLoading } = useWhatsAppAppointments({
    conversation_id: conversationId ?? null,
    ...filterParams,
    status: filterParams.status ? Array.from(filterParams.status) : null,
    limit: 200,
  });

  const updateStatus = useUpdateAppointmentStatus();
  const processReminders = useProcessPendingReminders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {(["upcoming", "today", "overdue", "completed", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="h-8"
            >
              {f === "upcoming" && "Próximos"}
              {f === "today" && "Hoje"}
              {f === "overdue" && "Atrasados"}
              {f === "completed" && "Concluídos"}
              {f === "all" && "Todos"}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => processReminders.mutate()}
          disabled={processReminders.isPending}
          className="h-8"
        >
          {processReminders.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Processar lembretes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar...
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Ainda não existem agendamentos. Transforme conversas em próximas ações concretas.
        </Card>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <AppointmentRow
              key={a.id}
              appointment={a}
              onComplete={() => updateStatus.mutate({ id: a.id, status: "completed" })}
              onCancel={() => updateStatus.mutate({ id: a.id, status: "cancelled" })}
              onConfirm={() => updateStatus.mutate({ id: a.id, status: "confirmed" })}
              onOpenConversation={
                onOpenConversation ??
                ((id) => navigate(`/dashboard/inbox?conversationId=${id}`))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentRow({
  appointment,
  onComplete,
  onCancel,
  onConfirm,
  onOpenConversation,
}: {
  appointment: WhatsAppAppointment;
  onComplete: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  const t = (appointment.appointment_type ?? "other") as AppointmentType;
  const Icon = typeIcon(t);
  const statusInfo = STATUS_BADGE[appointment.status] ?? STATUS_BADGE.scheduled;
  const start = new Date(appointment.start_time);
  const overdue =
    isPast(start) &&
    ["scheduled", "confirmed", "rescheduled"].includes(appointment.status);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-md flex items-center justify-center shrink-0",
            "bg-emerald-500/10 text-emerald-600",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{appointment.title}</h4>
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABEL[t]}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", statusInfo.className)}>
              {statusInfo.label}
            </Badge>
            {overdue && (
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-200">
                Atrasado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isToday(start) ? "Hoje" : format(start, "PPP", { locale: pt })} às{" "}
              {format(start, "HH:mm")}
            </span>
            {appointment.duration_minutes && (
              <span>· {appointment.duration_minutes} min</span>
            )}
            {appointment.confirmation_sent_at && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Confirmação enviada
              </span>
            )}
          </div>

          {(appointment.location || appointment.meeting_url) && (
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {appointment.meeting_url || appointment.location}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {appointment.conversation_id && (
              <DropdownMenuItem
                onClick={() => onOpenConversation(appointment.conversation_id!)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir conversa
              </DropdownMenuItem>
            )}
            {appointment.status === "scheduled" && (
              <DropdownMenuItem onClick={onConfirm}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marcar como confirmado
              </DropdownMenuItem>
            )}
            {!["completed", "cancelled"].includes(appointment.status) && (
              <DropdownMenuItem onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marcar como concluído
              </DropdownMenuItem>
            )}
            {!["cancelled", "completed"].includes(appointment.status) && (
              <DropdownMenuItem onClick={onCancel} className="text-rose-600">
                <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
