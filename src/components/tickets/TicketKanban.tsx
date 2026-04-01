import { memo } from "react";
import { type ClientTicketRow } from "@/hooks/tickets/useClientTicketsAdmin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import TimeAgo from "react-timeago";

const STATUS_ORDER = ["open", "in_progress", "waiting_client", "waiting_internal", "resolved", "closed"];
const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-l-muted-foreground",
  medium: "border-l-blue-400",
  high: "border-l-orange-400",
  urgent: "border-l-red-400",
};

interface TicketKanbanCardProps {
  ticket: ClientTicketRow;
  onTicketClick: (id: string) => void;
}

const TicketKanbanCard = memo(function TicketKanbanCard({ ticket, onTicketClick }: TicketKanbanCardProps) {
  return (
    <Card
      onClick={() => onTicketClick(ticket.id)}
      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${PRIORITY_COLORS[ticket.priority] || ""}`}
    >
      <p className="text-xs text-muted-foreground font-mono mb-1">{ticket.ticket_number || "—"}</p>
      <p className="text-sm font-medium text-foreground line-clamp-2">{ticket.subject}</p>
      <div className="flex items-center justify-between mt-2">
        <Badge variant="outline" className="text-xs">{ticket.type}</Badge>
        <span className="text-xs text-muted-foreground"><TimeAgo date={ticket.created_at} /></span>
      </div>
    </Card>
  );
});

interface TicketKanbanProps {
  tickets: ClientTicketRow[];
  onTicketClick: (id: string) => void;
}

export function TicketKanban({ tickets, onTicketClick }: TicketKanbanProps) {
  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status] || status,
    items: tickets.filter((t) => t.status === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.status} className="min-w-[280px] w-[280px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
            <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
          </div>
          <div className="space-y-2">
            {col.items.map((ticket) => (
              <TicketKanbanCard key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} />
            ))}
            {col.items.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                Sem tickets
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
