import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Toolbar } from "@/components/common/Toolbar";
import { CreateTicketDialog } from "@/components/helpdesk/CreateTicketDialog";
import { SLATimer } from "@/components/helpdesk/SLATimer";
import { TicketKanbanBoard } from "@/components/helpdesk/TicketKanbanBoard";
import { TicketBulkActions } from "@/components/helpdesk/TicketBulkActions";
import { useHelpdeskTickets, type TicketStatus, type TicketPriority } from "@/hooks/useHelpdeskTickets";
import { Headphones, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import TimeAgo from "react-timeago";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  on_hold: "Em Espera",
  resolved: "Resolvido",
  closed: "Fechado",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  waiting_client: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  waiting_internal: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

type ViewMode = "table" | "kanban";

export default function HelpdeskTicketsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filters = {
    status: statusFilter !== "all" ? [statusFilter as TicketStatus] : undefined,
    priority: priorityFilter !== "all" ? [priorityFilter as TicketPriority] : undefined,
    search: search || undefined,
  };

  const { tickets, isLoading, createTicket, updateTicket } = useHelpdeskTickets(filters);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }, [tickets, selectedIds]);

  const handleBulkUpdate = useCallback(
    async (updates: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string }) => {
      const ids = Array.from(selectedIds);
      try {
        await Promise.all(ids.map((id) => updateTicket.mutateAsync({ id, ...updates })));
        toast.success(`${ids.length} ticket(s) atualizado(s)`);
        setSelectedIds(new Set());
      } catch {
        toast.error("Erro ao atualizar tickets");
      }
    },
    [selectedIds, updateTicket]
  );

  const handleKanbanStatusChange = useCallback(
    (ticketId: string, newStatus: TicketStatus) => {
      updateTicket.mutate(
        { id: ticketId, status: newStatus },
        {
          onSuccess: () => toast.success("Ticket movido"),
          onError: () => toast.error("Erro ao mover ticket"),
        }
      );
    },
    [updateTicket]
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          Tickets
        </h1>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1"
              onClick={() => setViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Tabela</span>
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Kanban</span>
            </Button>
          </div>
          <CreateTicketDialog onSubmit={(data) => createTicket.mutateAsync(data)} />
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={search}
        searchPlaceholder="Pesquisar tickets..."
        onSearchChange={setSearch}
        showFilters={false}
        leftActions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Bulk Actions */}
      <TicketBulkActions
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkUpdate={handleBulkUpdate}
      />

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <TicketKanbanBoard
          tickets={tickets}
          onStatusChange={handleKanbanStatusChange}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        /* Table View */
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selectedIds.size === tickets.length}
                    onChange={toggleSelectAll}
                    className="rounded border-input"
                  />
                </TableHead>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="w-[120px]">Prioridade</TableHead>
                <TableHead className="w-[140px]">Estado</TableHead>
                <TableHead className="w-[120px]">Departamento</TableHead>
                <TableHead className="w-[100px]">SLA</TableHead>
                <TableHead className="w-[120px]">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Sem tickets encontrados
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    data-state={selectedIds.has(ticket.id) ? "selected" : undefined}
                    onClick={() => navigate(`/dashboard/helpdesk/tickets/${ticket.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="rounded border-input"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{ticket.subject}</div>
                      {ticket.tags?.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {ticket.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[ticket.priority]}`}>
                        {PRIORITY_LABELS[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ticket.department || "—"}
                    </TableCell>
                    <TableCell>
                      {ticket.sla_deadline && !["resolved", "closed"].includes(ticket.status) ? (
                        <SLATimer deadline={ticket.sla_deadline} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <TimeAgo date={ticket.created_at} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
