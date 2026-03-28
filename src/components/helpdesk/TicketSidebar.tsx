import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SLATimer } from "./SLATimer";
import { Calendar, Tag, User, Building2, Headphones, Flag, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/hooks/useHelpdeskTickets";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "waiting_client", label: "Aguarda Cliente" },
  { value: "waiting_internal", label: "Aguarda Interno" },
  { value: "on_hold", label: "Em Espera" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; color: string }[] = [
  { value: "low", label: "Baixa", color: "text-blue-600" },
  { value: "medium", label: "Média", color: "text-yellow-600" },
  { value: "high", label: "Alta", color: "text-orange-600" },
  { value: "urgent", label: "Urgente", color: "text-red-600" },
];

const DEPARTMENTS = ["Suporte", "Comercial", "Técnico", "Faturação"];

interface TicketSidebarProps {
  ticket: SupportTicket;
  onUpdate: (updates: Partial<SupportTicket>) => void;
}

export function TicketSidebar({ ticket, onUpdate }: TicketSidebarProps) {
  return (
    <div className="space-y-5 p-4">
      {/* SLA */}
      {ticket.sla_deadline && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> SLA
          </h4>
          <SLATimer deadline={ticket.sla_deadline} />
        </div>
      )}

      {/* Status */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Estado</h4>
        <Select
          value={ticket.status}
          onValueChange={(v) => onUpdate({ status: v as TicketStatus })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Flag className="h-3 w-3" /> Prioridade
        </h4>
        <Select
          value={ticket.priority}
          onValueChange={(v) => onUpdate({ priority: v as TicketPriority })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Department */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Headphones className="h-3 w-3" /> Departamento
        </h4>
        <Select
          value={ticket.department || ""}
          onValueChange={(v) => onUpdate({ department: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Tipo</h4>
        <Badge variant="outline" className="text-xs capitalize">{ticket.type}</Badge>
      </div>

      {/* Channel */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Canal</h4>
        <Badge variant="secondary" className="text-xs capitalize">{ticket.channel}</Badge>
      </div>

      {/* Tags */}
      {ticket.tags && ticket.tags.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Tags
          </h4>
          <div className="flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Datas
        </h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Criado: {format(new Date(ticket.created_at), "dd MMM yyyy HH:mm", { locale: pt })}</div>
          {ticket.first_response_at && (
            <div>1ª Resposta: {format(new Date(ticket.first_response_at), "dd MMM HH:mm", { locale: pt })}</div>
          )}
          {ticket.resolved_at && (
            <div>Resolvido: {format(new Date(ticket.resolved_at), "dd MMM HH:mm", { locale: pt })}</div>
          )}
        </div>
      </div>

      {/* Ticket Number */}
      <div className="text-xs text-muted-foreground">
        Ticket #{ticket.ticket_number}
      </div>
    </div>
  );
}
