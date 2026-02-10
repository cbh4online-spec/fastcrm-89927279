import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientTickets, TicketType, TicketPriority } from "@/hooks/client-portal/useClientTickets";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Headphones, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_client: "bg-orange-100 text-orange-800",
  waiting_internal: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-muted text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  support: "Suporte",
  commercial: "Comercial",
  technical: "Técnico",
};

export default function ClientSupportPage() {
  const { tickets, isLoading, createTicket } = useClientTickets();
  const { canCreateTickets, isLoading: permissionsLoading } = useClientPermissions();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    type: "support" as TicketType,
    priority: "medium" as TicketPriority,
  });

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openTickets = filtered.filter((t) => !["resolved", "closed"].includes(t.status));
  const closedTickets = filtered.filter((t) => ["resolved", "closed"].includes(t.status));

  const handleCreate = async () => {
    if (!form.subject.trim()) {
      toast.error("Preencha o assunto");
      return;
    }
    try {
      await createTicket.mutateAsync(form);
      toast.success("Ticket criado com sucesso");
      setDialogOpen(false);
      setForm({ subject: "", description: "", type: "support", priority: "medium" });
    } catch {
      toast.error("Erro ao criar ticket");
    }
  };

  const getSlaIndicator = (deadline: string | null) => {
    if (!deadline) return null;
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining < 0) return <Badge variant="destructive" className="text-xs">SLA Expirado</Badge>;
    if (remaining < 3600000) return <Badge className="bg-orange-100 text-orange-800 text-xs">SLA &lt; 1h</Badge>;
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(new Date(deadline), { locale: pt, addSuffix: true })}
      </span>
    );
  };

  const TicketTable = ({ data }: { data: typeof tickets }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assunto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>SLA</TableHead>
          <TableHead>Criado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Nenhum ticket encontrado
            </TableCell>
          </TableRow>
        ) : (
          data.map((t) => (
            <TableRow
              key={t.id}
              className="cursor-pointer"
              onClick={() => navigate(`/client/support/${t.id}`)}
            >
              <TableCell className="font-medium max-w-[250px] truncate">{t.subject}</TableCell>
              <TableCell><Badge variant="outline">{typeLabels[t.type]}</Badge></TableCell>
              <TableCell><Badge className={priorityColors[t.priority]}>{priorityLabels[t.priority]}</Badge></TableCell>
              <TableCell><Badge className={statusColors[t.status]}>{statusLabels[t.status]}</Badge></TableCell>
              <TableCell>{getSlaIndicator(t.sla_deadline)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(t.created_at), "dd/MM/yyyy", { locale: pt })}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (permissionsLoading || isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>A carregar...</p>
      </div>
    );
  }

  if (!canCreateTickets && tickets.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Não tem permissões para aceder ao suporte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6" /> Suporte
          </h1>
          <p className="text-muted-foreground">Gerir tickets de suporte da sua empresa</p>
        </div>

        {canCreateTickets && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Assunto *</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Descreva o problema brevemente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TicketType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="support">Suporte</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva o problema em detalhe..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleCreate} disabled={createTicket.isPending} className="w-full">
                  {createTicket.isPending ? "A criar..." : "Criar Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Abertos ({openTickets.length})</TabsTrigger>
          <TabsTrigger value="closed">Fechados ({closedTickets.length})</TabsTrigger>
          <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><Card><CardContent className="p-0"><TicketTable data={openTickets} /></CardContent></Card></TabsContent>
        <TabsContent value="closed"><Card><CardContent className="p-0"><TicketTable data={closedTickets} /></CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="p-0"><TicketTable data={filtered} /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
