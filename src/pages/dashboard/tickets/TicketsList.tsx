import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClientTicketsAdmin, type ClientTicketRow } from "@/hooks/tickets/useClientTicketsAdmin";
import { useCreateClientTicket } from "@/hooks/tickets/useCreateClientTicket";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useURLFilters } from "@/hooks/useURLFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, LayoutGrid, List, Headphones, User } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Fuse from "fuse.js";
import TimeAgo from "react-timeago";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { TicketKanban } from "@/components/tickets/TicketKanban";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  waiting_client: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  waiting_internal: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  closed: "bg-muted text-muted-foreground border-muted",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/15 text-blue-400",
  high: "bg-orange-500/15 text-orange-400",
  urgent: "bg-red-500/15 text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const TYPE_LABELS: Record<string, string> = {
  support: "Suporte",
  commercial: "Comercial",
  technical: "Técnico",
};

export default function TicketsList() {
  const navigate = useNavigate();
  const { filters, setFilter } = useURLFilters({
    status: "",
    priority: "",
    type: "",
    assigned_to: "",
    search: "",
  });
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const debouncedSearch = useDebounce(filters.search, 300);

  const queryFilters = useMemo(() => ({
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    type: filters.type || undefined,
    assigned_to: filters.assigned_to || undefined,
  }), [filters.status, filters.priority, filters.type, filters.assigned_to]);

  const { data: tickets = [], isLoading } = useClientTicketsAdmin(queryFilters);
  const { data: agents } = useAgentMembers();
  const createTicket = useCreateClientTicket();

  // Build agent lookup map
  const agentMap = useMemo(() => {
    const map = new Map<string, { name: string; initials: string }>();
    agents?.forEach((a) => {
      const name = a.profile?.full_name || a.profile?.email || "Agente";
      const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      map.set(a.user_id, { name, initials });
    });
    return map;
  }, [agents]);

  // Fuzzy search
  const fuse = useMemo(
    () => new Fuse(tickets, { keys: ["subject", "ticket_number", "description"], threshold: 0.3 }),
    [tickets]
  );

  const filtered = debouncedSearch
    ? fuse.search(debouncedSearch).map((r) => r.item)
    : tickets;

  // Create form state
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", type: "support", priority: "medium" });

  const handleCreate = async () => {
    if (!newTicket.subject.trim()) return;
    try {
      await createTicket.mutateAsync(newTicket);
      toast.success("Ticket criado com sucesso");
      setShowCreateDialog(false);
      setNewTicket({ subject: "", description: "", type: "support", priority: "medium" });
    } catch {
      toast.error("Erro ao criar ticket");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tickets de Suporte</h1>
            <p className="text-sm text-muted-foreground">Gestão de tickets de clientes B2B</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tickets..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.priority || "all"} onValueChange={(v) => setFilter("priority", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.type || "all"} onValueChange={(v) => setFilter("type", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assigned_to || "all"} onValueChange={(v) => setFilter("assigned_to", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Agente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os agentes</SelectItem>
            {agents?.map((agent) => (
              <SelectItem key={agent.user_id} value={agent.user_id}>
                {agent.profile?.full_name || agent.profile?.email || "Agente"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto border rounded-lg p-0.5">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("kanban")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Headphones className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Nenhum ticket encontrado</p>
          <p className="text-sm">Crie um novo ticket ou ajuste os filtros</p>
        </div>
      ) : viewMode === "kanban" ? (
        <TicketKanban tickets={filtered} onTicketClick={(id) => navigate(`/dashboard/tickets/${id}`)} />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Nº</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Assunto</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Prioridade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Agente</th>
                <th className="text-left p-3 font-medium text-muted-foreground">SLA</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Atualizado</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Criado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const agent = ticket.assigned_to ? agentMap.get(ticket.assigned_to) : null;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono text-xs text-muted-foreground">{ticket.ticket_number || "—"}</td>
                    <td className="p-3 font-medium text-foreground max-w-[300px] truncate">{ticket.subject}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{TYPE_LABELS[ticket.type] || ticket.type}</Badge></td>
                    <td className="p-3"><Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority] || ""}`}>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</Badge></td>
                    <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[ticket.status] || ""}`}>{STATUS_LABELS[ticket.status] || ticket.status}</Badge></td>
                    <td className="p-3">
                      {agent ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{agent.initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground truncate max-w-[100px]">{agent.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Sem agente
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {ticket.sla_deadline ? (
                        <SLACountdown deadline={ticket.sla_deadline} breached={ticket.sla_breached} />
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground"><TimeAgo date={ticket.updated_at} /></td>
                    <td className="p-3 text-xs text-muted-foreground"><TimeAgo date={ticket.created_at} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assunto *</Label>
              <Input value={newTicket.subject} onChange={(e) => setNewTicket((t) => ({ ...t, subject: e.target.value }))} placeholder="Descreva o problema..." />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newTicket.description} onChange={(e) => setNewTicket((t) => ({ ...t, description: e.target.value }))} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={newTicket.type} onValueChange={(v) => setNewTicket((t) => ({ ...t, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={newTicket.priority} onValueChange={(v) => setNewTicket((t) => ({ ...t, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createTicket.isPending || !newTicket.subject.trim()}>
              {createTicket.isPending ? "A criar..." : "Criar Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SLACountdown({ deadline, breached }: { deadline: string; breached: boolean }) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();

  if (breached || diff < 0) {
    return <span className="text-red-400 font-medium animate-pulse">SLA ultrapassado</span>;
  }

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (hours < 1) {
    return <span className="text-amber-400 font-medium">{mins}m restantes</span>;
  }

  return <span className="text-green-400">{hours}h {mins}m</span>;
}
