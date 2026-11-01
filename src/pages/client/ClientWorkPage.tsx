import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lisbonMonthKey } from "@/lib/dates/currentMonth";
import { monthRange, periodLabel } from "@/lib/dates/monthRange";
import { APPROVAL_LABEL, formatMinutes, type ClientApprovalStatus } from "@/lib/retainers/retainerUsage";

const db = supabase as any;
const TASK_STATUS: Record<string, string> = {
  open: "Por fazer", in_progress: "Em curso", waiting_customer: "Aguarda por si", waiting_internal: "Em análise",
  blocked: "Bloqueada", review: "Em revisão", completed: "Concluída", cancelled: "Cancelada", skipped: "Não aplicável",
};
const TICKET_STATUS: Record<string, string> = {
  open: "Aberto", in_progress: "Em curso", pending: "Pendente", waiting_customer: "Aguarda por si", resolved: "Resolvido", closed: "Fechado",
};

interface HourRow { kind: "project" | "ticket"; id: string; date: string; minutes: number; description: string | null; label: string; task: string | null; status: ClientApprovalStatus; note: string | null; retainer: string }

function shiftMonth(key: string, d: number) {
  const [y, m] = key.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function ClientWorkPage() {
  const workspaceId = localStorage.getItem("client_workspace_id");
  const qc = useQueryClient();
  const [monthKey, setMonthKey] = useState(lisbonMonthKey());
  const [y, m] = monthKey.split("-").map(Number);
  const { from, to } = monthRange(y, m);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [note, setNote] = useState("");

  const work = useQuery({
    queryKey: ["portal-work", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await db.rpc("portal_list_work", { _workspace: workspaceId });
      if (error) throw error;
      return data as { can_approve: boolean; projects: any[]; tickets: any[] };
    },
  });
  const hours = useQuery({
    queryKey: ["portal-hours", workspaceId, monthKey],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await db.rpc("portal_list_hours", { _workspace: workspaceId, _from: from, _to: to });
      if (error) throw error;
      return (data ?? []) as HourRow[];
    },
  });
  const review = useMutation({
    mutationFn: async ({ items, decision, note }: { items: HourRow[]; decision: "approved" | "disputed"; note?: string }) => {
      const { data, error } = await db.rpc("portal_review_hours", {
        _workspace: workspaceId, _items: items.map((i) => ({ kind: i.kind, id: i.id })), _decision: decision, _note: note ?? null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n, v) => {
      toast.success(v.decision === "approved" ? `${n} registos aprovados` : "Pedido de esclarecimento enviado");
      setSelected(new Set()); setDisputeOpen(false); setNote("");
      qc.invalidateQueries({ queryKey: ["portal-hours"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível guardar"),
  });

  const rows = hours.data ?? [];
  const pending = rows.filter((r) => r.status === "pending_client");
  const key = (r: HourRow) => `${r.kind}:${r.id}`;
  const chosen = rows.filter((r) => selected.has(key(r)));
  const totals = useMemo(() => {
    const t: Record<string, number> = { pending_client: 0, approved: 0, disputed: 0 };
    rows.forEach((r) => { t[r.status] = (t[r.status] ?? 0) + r.minutes; });
    return t;
  }, [rows]);
  const canApprove = !!work.data?.can_approve;

  if (work.isLoading) return <ClientLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></ClientLayout>;
  if (work.error) return <ClientLayout><Card><CardContent className="p-6 text-muted-foreground">Esta área ainda não está disponível para a sua conta. Fale com o seu gestor.</CardContent></Card></ClientLayout>;

  const ticketsByTask = new Map<string, any[]>();
  (work.data?.tickets ?? []).forEach((t) => { if (t.task_id) ticketsByTask.set(t.task_id, [...(ticketsByTask.get(t.task_id) ?? []), t]); });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projetos & Horas</h1>
          <p className="text-muted-foreground">Acompanhe as tarefas, os pedidos de suporte e aprove as horas de cada mês.</p>
        </div>
        <Tabs defaultValue={pending.length ? "hours" : "projects"}>
          <TabsList>
            <TabsTrigger value="projects">Projetos e tarefas</TabsTrigger>
            <TabsTrigger value="tickets">Tickets ({work.data?.tickets.length ?? 0})</TabsTrigger>
            <TabsTrigger value="hours">Aprovar horas{pending.length ? ` (${pending.length})` : ""}</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {(work.data?.projects ?? []).length === 0 && <Card><CardContent className="p-6 text-muted-foreground">Ainda não há projetos.</CardContent></Card>}
            {(work.data?.projects ?? []).map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <div className="flex items-center gap-3"><Progress value={Number(p.progress ?? 0)} className="h-2 flex-1" /><span className="text-sm text-muted-foreground">{Number(p.progress ?? 0)}%</span></div>
                </CardHeader>
                <CardContent>
                  {p.tasks.length === 0 ? <p className="text-sm text-muted-foreground">Sem tarefas partilhadas.</p> : (
                    <ul className="divide-y divide-border">{p.tasks.map((t: any) => (
                      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMinutes(t.used_minutes ?? 0)} gastas{t.estimated_hours ? ` de ${t.estimated_hours}h previstas` : ""}
                            {t.due_at ? ` · prazo ${new Date(t.due_at).toLocaleDateString("pt-PT")}` : ""}
                            {ticketsByTask.get(t.id)?.length ? ` · ${ticketsByTask.get(t.id)!.length} ticket(s)` : ""}
                          </p>
                        </div>
                        <Badge variant={t.status === "completed" ? "default" : t.status === "waiting_customer" ? "destructive" : "outline"}>{TASK_STATUS[t.status] ?? t.status}</Badge>
                      </li>))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tickets">
            <Card><CardContent className="p-0">
              {(work.data?.tickets ?? []).length === 0 ? <p className="p-6 text-muted-foreground">Sem tickets.</p> : (
                <ul className="divide-y divide-border">{work.data!.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 p-4">
                    <div><p className="text-sm font-medium text-foreground">{t.number ? `#${t.number} ` : ""}{t.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-PT")}</p></div>
                    <Badge variant="outline">{TICKET_STATUS[t.status] ?? t.status}</Badge>
                  </li>))}
                </ul>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => { setSelected(new Set()); setMonthKey(shiftMonth(monthKey, -1)); }}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-36 text-center font-medium text-foreground">{periodLabel(from, to)}</span>
              <Button variant="outline" size="icon" aria-label="Mês seguinte" onClick={() => { setSelected(new Set()); setMonthKey(shiftMonth(monthKey, 1)); }}><ChevronRight className="h-4 w-4" /></Button>
              <span className="ml-auto text-sm text-muted-foreground">
                Por aprovar {formatMinutes(totals.pending_client)} · Aprovadas {formatMinutes(totals.approved)} · Contestadas {formatMinutes(totals.disputed)}
              </span>
            </div>
            {!canApprove && <p className="text-sm text-muted-foreground">Pode consultar as horas. A aprovação é feita por um administrador ou responsável financeiro da sua empresa.</p>}
            {canApprove && pending.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => review.mutate({ items: chosen.length ? chosen.filter((r) => r.status !== "approved") : pending, decision: "approved" })} disabled={review.isPending}>
                  {chosen.length ? `Aprovar ${chosen.length} selecionados` : `Aprovar todas (${formatMinutes(totals.pending_client)})`}
                </Button>
                <Button variant="outline" disabled={!chosen.length || review.isPending} onClick={() => setDisputeOpen(true)}>Pedir esclarecimento</Button>
              </div>
            )}
            <Card><CardContent className="overflow-x-auto p-0">
              {hours.isLoading ? <p className="p-6 text-muted-foreground">A carregar...</p>
                : rows.length === 0 ? <p className="p-6 text-muted-foreground">Não há horas enviadas para aprovação neste mês.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    {canApprove && <TableHead className="w-10" />}
                    <TableHead>Data</TableHead><TableHead>Onde</TableHead><TableHead>O que foi feito</TableHead><TableHead className="text-right">Tempo</TableHead><TableHead>Estado</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{rows.map((r) => (
                    <TableRow key={key(r)}>
                      {canApprove && <TableCell>{r.status !== "approved" && (
                        <Checkbox aria-label="Selecionar registo" checked={selected.has(key(r))}
                          onCheckedChange={(c) => setSelected((s) => { const n = new Set(s); c ? n.add(key(r)) : n.delete(key(r)); return n; })} />)}</TableCell>}
                      <TableCell className="whitespace-nowrap">{r.date.split("-").reverse().join("/")}</TableCell>
                      <TableCell className="max-w-48"><span className="block truncate">{r.label}</span>{r.task && <span className="block truncate text-xs text-muted-foreground">{r.task}</span>}</TableCell>
                      <TableCell className="max-w-72">{r.description ?? "—"}{r.note && <span className="block text-xs text-destructive">A sua nota: {r.note}</span>}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatMinutes(r.minutes)}</TableCell>
                      <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "disputed" ? "destructive" : "outline"}>{r.status === "pending_client" ? "Por aprovar" : APPROVAL_LABEL[r.status]}</Badge></TableCell>
                    </TableRow>))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pedir esclarecimento ({chosen.length} registos)</DialogTitle></DialogHeader>
          <Textarea rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explique o que não está correto" aria-label="Motivo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancelar</Button>
            <Button disabled={note.trim().length < 3 || review.isPending} onClick={() => review.mutate({ items: chosen, decision: "disputed", note: note.trim() })}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
