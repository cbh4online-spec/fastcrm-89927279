import { useHelpdeskTickets, type SupportTicket } from "@/hooks/useHelpdeskTickets";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TimeAgo from "react-timeago";

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

interface TicketRelatedListProps {
  currentTicket: SupportTicket;
}

export function TicketRelatedList({ currentTicket }: TicketRelatedListProps) {
  const { tickets } = useHelpdeskTickets();
  const navigate = useNavigate();

  // Find related tickets: same contact, company, or similar tags
  const related = tickets.filter((t) => {
    if (t.id === currentTicket.id) return false;
    if (currentTicket.contact_id && t.contact_id === currentTicket.contact_id) return true;
    if (currentTicket.company_id && t.company_id === currentTicket.company_id) return true;
    if (
      currentTicket.tags?.length > 0 &&
      t.tags?.some((tag) => currentTicket.tags.includes(tag))
    )
      return true;
    return false;
  });

  if (related.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Sem tickets relacionados</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {related.slice(0, 20).map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => navigate(`/dashboard/helpdesk/tickets/${ticket.id}`)}
        >
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            #{ticket.ticket_number}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ticket.subject}</p>
            <span className="text-[10px] text-muted-foreground">
              <TimeAgo date={ticket.created_at} />
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
