import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SLATimer } from "./SLATimer";
import { AgentAssignDropdown } from "./AgentAssignDropdown";
import { TicketTagsEditor } from "./TicketTagsEditor";
import { CSATWidget } from "./CSATWidget";
import { TicketClientCard } from "./TicketClientCard";
import { TicketClientHistory } from "./TicketClientHistory";
import { Calendar, Tag, User, Building2, Headphones, Flag, Clock, Copy, CheckCircle, UserCircle, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import TimeAgo from "react-timeago";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/hooks/useHelpdeskTickets";
import { useState } from "react";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "waiting_client", label: "Aguarda Cliente" },
  { value: "waiting_internal", label: "Aguarda Interno" },
  { value: "on_hold", label: "Em Espera" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const DEPARTMENTS = ["Suporte", "Comercial", "Técnico", "Faturação"];

const TYPE_LABELS: Record<string, string> = {
  support: "Suporte",
  commercial: "Comercial",
  technical: "Técnico",
  billing: "Faturação",
  feature_request: "Funcionalidade",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefone",
  portal: "Portal",
  chat: "Chat",
  manual: "Manual",
};

interface TicketSidebarProps {
  ticket: SupportTicket;
  onUpdate: (updates: Partial<SupportTicket>) => void;
}

export function TicketSidebar({ ticket, onUpdate }: TicketSidebarProps) {
  const [copied, setCopied] = useState(false);
  const [satComment, setSatComment] = useState(ticket.satisfaction_comment || "");
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  const handleCopyId = () => {
    navigator.clipboard.writeText(ticket.id);
    setCopied(true);
    toast.success("ID copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSatRating = (rating: number) => {
    onUpdate({ satisfaction_rating: rating });
  };

  const handleSatCommentSave = () => {
    if (satComment !== (ticket.satisfaction_comment || "")) {
      onUpdate({ satisfaction_comment: satComment || null } as any);
      toast.success("Comentário de satisfação guardado");
    }
  };

  return (
    <div className="space-y-5 p-4">
      {/* ── CLIENT IDENTIFICATION ── */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <UserCircle className="h-3 w-3" /> Cliente
        </h4>
        <TicketClientCard contactId={ticket.contact_id} companyId={ticket.company_id} />
      </div>

      <div className="border-t border-border" />

      {/* SLA */}
      {ticket.sla_deadline && !isResolved && (
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

      {/* Agent Assignment */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <User className="h-3 w-3" /> Agente
        </h4>
        <AgentAssignDropdown
          value={ticket.assigned_to}
          onChange={(agentId) => onUpdate({ assigned_to: agentId })}
        />
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
        <Badge variant="outline" className="text-xs">{TYPE_LABELS[ticket.type] || ticket.type}</Badge>
      </div>

      {/* Channel */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Canal</h4>
        <Badge variant="secondary" className="text-xs">{CHANNEL_LABELS[ticket.channel] || ticket.channel}</Badge>
      </div>

      {/* Tags — editable */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Tag className="h-3 w-3" /> Tags
        </h4>
        <TicketTagsEditor
          tags={ticket.tags || []}
          onChange={(tags) => onUpdate({ tags })}
        />
      </div>

      <div className="border-t border-border" />

      {/* ── SATISFACTION (CSAT) ── */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Satisfação (CSAT)
        </h4>
        {isResolved ? (
          <div className="space-y-2">
            <CSATWidget
              rating={ticket.satisfaction_rating}
              onChange={handleSatRating}
            />
            <Textarea
              value={satComment}
              onChange={(e) => setSatComment(e.target.value)}
              onBlur={handleSatCommentSave}
              placeholder="Comentário do cliente..."
              className="min-h-[60px] text-xs resize-none"
            />
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">
            Disponível após resolução do ticket
          </p>
        )}
      </div>

      {/* Description */}
      {ticket.description && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <MessageSquareText className="h-3 w-3" /> Descrição
          </h4>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {ticket.description}
          </p>
        </div>
      )}

      {/* Dates — with relative time */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Datas
        </h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Criado:</span>
            <span className="text-foreground"><TimeAgo date={ticket.created_at} /></span>
          </div>
          {ticket.first_response_at && (
            <div className="flex justify-between">
              <span>1ª Resposta:</span>
              <span className="text-foreground"><TimeAgo date={ticket.first_response_at} /></span>
            </div>
          )}
          {ticket.resolved_at && (
            <div className="flex justify-between">
              <span>Resolvido:</span>
              <span className="text-foreground"><TimeAgo date={ticket.resolved_at} /></span>
            </div>
          )}
          {ticket.closed_at && (
            <div className="flex justify-between">
              <span>Fechado:</span>
              <span className="text-foreground"><TimeAgo date={ticket.closed_at} /></span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket ID with copy */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Ticket #{ticket.ticket_number}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={handleCopyId}
        >
          {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar ID"}
        </Button>
      </div>
    </div>
  );
}
