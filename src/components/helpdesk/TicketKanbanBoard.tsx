import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { SLATimer } from "./SLATimer";
import { cn } from "@/lib/utils";
import type { SupportTicket, TicketStatus } from "@/hooks/useHelpdeskTickets";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag } from "lucide-react";

const KANBAN_COLUMNS: { id: TicketStatus; label: string; color: string }[] = [
  { id: "open", label: "Aberto", color: "bg-blue-500" },
  { id: "in_progress", label: "Em Progresso", color: "bg-purple-500" },
  { id: "waiting_client", label: "Aguarda Cliente", color: "bg-yellow-500" },
  { id: "waiting_internal", label: "Aguarda Interno", color: "bg-orange-500" },
  { id: "resolved", label: "Resolvido", color: "bg-green-500" },
];

const PRIORITY_ICONS: Record<string, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

interface TicketKanbanBoardProps {
  tickets: SupportTicket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

function KanbanCard({
  ticket,
  isSelected,
  onToggleSelect,
}: {
  ticket: SupportTicket;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
        isDragging && "opacity-50",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(ticket.id);
          }}
          className="mt-0.5 rounded border-input"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          className="flex-1 min-w-0"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/dashboard/helpdesk/tickets/${ticket.id}`);
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">
              #{ticket.ticket_number}
            </span>
            <span className="text-xs">{PRIORITY_ICONS[ticket.priority]}</span>
          </div>
          <p className="text-sm font-medium truncate">{ticket.subject}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {ticket.department && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {ticket.department}
              </Badge>
            )}
            {ticket.sla_deadline &&
              !["resolved", "closed"].includes(ticket.status) && (
                <SLATimer deadline={ticket.sla_deadline} className="text-[10px]" />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tickets,
  selectedIds,
  onToggleSelect,
}: {
  column: (typeof KANBAN_COLUMNS)[0];
  tickets: SupportTicket[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[260px] w-[280px] shrink-0 rounded-lg bg-muted/30 border",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <div className={cn("h-2 w-2 rounded-full", column.color)} />
        <span className="text-sm font-medium">{column.label}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {tickets.length}
        </Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <KanbanCard
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedIds.has(ticket.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Sem tickets
          </p>
        )}
      </div>
    </div>
  );
}

export function TicketKanbanBoard({
  tickets,
  onStatusChange,
  selectedIds,
  onToggleSelect,
}: TicketKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columnTickets = useMemo(() => {
    const map: Record<string, SupportTicket[]> = {};
    KANBAN_COLUMNS.forEach((c) => (map[c.id] = []));
    tickets.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      }
    });
    return map;
  }, [tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const ticketId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const isColumn = KANBAN_COLUMNS.some((c) => c.id === overId);
    if (isColumn) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket && ticket.status !== overId) {
        onStatusChange(ticketId, overId as TicketStatus);
      }
      return;
    }

    // Dropped on another card — find which column it belongs to
    const targetTicket = tickets.find((t) => t.id === overId);
    if (targetTicket) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket && ticket.status !== targetTicket.status) {
        onStatusChange(ticketId, targetTicket.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tickets={columnTickets[column.id] || []}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </DndContext>
  );
}
