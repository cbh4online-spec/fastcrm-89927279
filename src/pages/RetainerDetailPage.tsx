import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send, ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateRetainerDraftInvoice, useCreateRetainerWorkItem, useDeleteRetainerEntry, useLinkToRetainer, useRetainerMonthInvoice, useProfileNames, useRetainer, useRetainerEntries, useRetainerLinks, useSendHoursForApproval,
} from "@/hooks/useRetainers";
import type { RetainerEntry } from "@/lib/retainers/retainerUsage";
import { APPROVAL_LABEL, buildRetainerInvoiceLines, computeRetainerUsage, formatMinutes, isRetainerBillableMonth, summarizeApproval } from "@/lib/retainers/retainerUsage";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { lisbonMonthKey } from "@/lib/dates/currentMonth";
import { periodLabel, monthRange } from "@/lib/dates/monthRange";
import { RetainerKpis, RetainerUsageBar } from "@/components/retainers/RetainerUsageSummary";
import { RetainerFormDialog } from "@/components/retainers/RetainerFormDialog";
import { AddWorkItemDialog } from "@/components/retainers/AddWorkItemDialog";
import { LogRetainerTimeDialog } from "@/components/retainers/LogRetainerTimeDialog";

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function csvCell(v: string) { return `"${v.replace(/"/g, '""')}"`; }

export default function RetainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [monthKey, setMonthKey] = useState(lisbonMonthKey());
  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<RetainerEntry | null>(null);
  const [vatRate, setVatRate] = useState("23");
  const [addKind, setAddKind] = useState<"project" | "ticket" | null>(null);
  const createItem = useCreateRetainerWorkItem();
  const { data: retainer, isLoading } = useRetainer(id);
  const { data: entries = [], isLoading: entriesLoading, error: entriesError } = useRetainerEntries(id, monthKey);
  const { data: links } = useRetainerLinks(retainer);
  const { data: names } = useProfileNames(entries.map((e) => e.userId ?? ""));
  const link = useLinkToRetainer();
  const del = useDeleteRetainerEntry();
  const createInvoice = useCreateRetainerDraftInvoice();
  const sendApproval = useSendHoursForApproval();
  const { data: monthInvoice } = useRetainerMonthInvoice(id, monthKey);
  const [invoiceConfirm, setInvoiceConfirm] = useState(false);
  const [pending, setPending] = useState<{ kind: "project" | "ticket"; id: string; retainerId: string | null; label: string; minutes: number | null } | null>(null);

  const requestLink = async (kind: "project" | "ticket", pid: string, retainerId: string | null, label: string) => {
    setPending({ kind, id: pid, retainerId, label, minutes: null });
    const table = kind === "project" ? "implementation_time_entries" : "support_ticket_time_entries";
    const col = kind === "project" ? "project_id" : "ticket_id";
    const { data, error } = await (supabase as any).from(table).select("duration_minutes").eq(col, pid).limit(5000);
    const total = error ? -1 : (data ?? []).reduce((a: number, r: any) => a + (r.duration_minutes ?? 0), 0);
    setPending((p) => (p && p.id === pid ? { ...p, minutes: total } : p));
  };

  const usage = useMemo(() => computeRetainerUsage(entries, Number(retainer?.included_hours ?? 0), Number(retainer?.overage_hourly_rate ?? 0)), [entries, retainer]);

  /** Marca cada registo como "avença" ou "extra" pela ordem cronológica. */
  const flagged = useMemo(() => {
    const inc = usage.includedMinutes;
    let acc = 0;
    const asc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, string>();
    for (const e of asc) {
      if (!e.billable) { map.set(e.id, "Interno"); continue; }
      const before = acc; acc += e.minutes;
      map.set(e.id, before >= inc ? "Extra" : acc > inc ? "Parcial extra" : "Avença");
    }
    return map;
  }, [entries, usage.includedMinutes]);

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar...</div>;
  if (!retainer) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Avença não encontrada.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/dashboard/retainers">Voltar</Link></Button>
    </div>
  );

  const linkedProjects = (links?.projects ?? []).filter((p) => p.retainer_id === retainer.id);
  const linkedTickets = (links?.tickets ?? []).filter((t) => t.retainer_id === retainer.id);
  const sameCo = (x: any) => !!retainer.company_id && x.company_id === retainer.company_id;
  const freeProjects = (links?.projects ?? []).filter((p) => !p.retainer_id);
  const freeTickets = (links?.tickets ?? []).filter((t) => !t.retainer_id);
  const addItems = addKind === "project"
    ? freeProjects.map((p) => ({ id: p.id, label: p.title, sameCompany: sameCo(p) }))
    : freeTickets.map((t) => ({ id: t.id, label: `${t.ticket_number ? `#${t.ticket_number} ` : ""}${t.subject}`, sameCompany: sameCo(t) }));
  const feeDue = isRetainerBillableMonth(retainer, monthKey);
  const invoiceLines = buildRetainerInvoiceLines(
    { name: retainer.name, monthly_fee: Number(retainer.monthly_fee), overage_hourly_rate: Number(retainer.overage_hourly_rate) },
    monthKey, usage, feeDue, Number(vatRate));
  const invoiceNet = invoiceLines.reduce((a, l) => a + Math.round(l.quantity * l.unit_price * 100) / 100, 0);
  const [y, m] = monthKey.split("-").map(Number);
  const { from, to } = monthRange(y, m);

  const approval = summarizeApproval(entries);
  const toSend = approval.submitted + approval.disputed;

  const exportCsv = () => {
    const header = ["Data", "Tipo", "Projeto/Ticket", "Pessoa", "Descrição", "Minutos", "Horas", "Classificação", "Cliente"];
    const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [
      e.date, e.source === "project" ? "Projeto" : "Suporte", e.parentLabel, names?.get(e.userId ?? "") ?? "",
      e.description ?? "", String(e.minutes), (e.minutes / 60).toFixed(2).replace(".", ","), flagged.get(e.id) ?? "", APPROVAL_LABEL[e.approval ?? "submitted"],
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `avenca-${retainer.name.replace(/[^\w-]+/g, "_")}-${monthKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Link to="/dashboard/retainers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Avenças</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{retainer.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {retainer.companies?.name ?? "Sem empresa"} · {Number(retainer.included_hours)}h/mês · {Number(retainer.overage_hourly_rate)} €/hora extra
            {retainer.status !== "active" && <Badge variant="outline" className="ml-2">{retainer.status === "paused" ? "Pausada" : "Terminada"}</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>Editar</Button>
          <Button onClick={() => setLogOpen(true)}><Plus className="mr-2 h-4 w-4" />Registar tempo</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMonthKey(shiftMonth(monthKey, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-36 text-center font-medium text-foreground">{periodLabel(from, to)}</span>
        <Button variant="outline" size="icon" aria-label="Mês seguinte" onClick={() => setMonthKey(shiftMonth(monthKey, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <RetainerKpis usage={usage} monthlyFee={Number(retainer.monthly_fee)} feeDue={feeDue} />

      <IXCard title="Faturação do mês" description="Cria um rascunho de fatura com a mensalidade e as horas extra. Reveja e emita-o em Faturas.">
        {monthInvoice ? (
          <p className="text-sm text-foreground">Já existe a fatura <Link className="font-medium underline" to={`/dashboard/invoices/${monthInvoice.id}`}>{monthInvoice.invoice_number}</Link> ({monthInvoice.status === "draft" ? "rascunho" : monthInvoice.status}) para este mês.</p>
        ) : invoiceLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada a faturar neste mês.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="space-y-1 text-sm text-foreground">{invoiceLines.map((l) => (
              <li key={l.description}>{l.description}: {l.quantity.toLocaleString("pt-PT")} × {l.unit_price.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</li>
            ))}<li className="font-medium">Total sem IVA: {invoiceNet.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</li></ul>
            <div className="flex flex-wrap items-center gap-2">
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger className="h-9 w-36" aria-label="Taxa de IVA"><SelectValue /></SelectTrigger>
              <SelectContent>{["23", "13", "6", "0"].map((v) => <SelectItem key={v} value={v}>{v === "0" ? "Isento (0%)" : `IVA ${v}%`}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => setInvoiceConfirm(true)} disabled={!retainer.company_id || createInvoice.isPending}>
              <FileText className="mr-2 h-4 w-4" />Criar rascunho de fatura
            </Button>
            </div>
          </div>
        )}
        {!retainer.company_id && <p className="mt-2 text-sm text-destructive">Associe uma empresa à avença para poder faturar.</p>}
      </IXCard>

      <AlertDialog open={invoiceConfirm} onOpenChange={setInvoiceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar rascunho de fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Será criado um rascunho para {retainer.companies?.name ?? "a empresa"} de {invoiceNet.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} + {vatRate === "0" ? "isento de IVA" : `IVA ${vatRate}%`}. Não é emitido nem enviado ao cliente; pode rever e alterar em Faturas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => createInvoice.mutate({ retainer, monthKey, lines: invoiceLines })}>Criar rascunho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <IXCard title="Consumo do mês" description="Cor cheia = projetos · cor clara = suporte. As horas não passam para o mês seguinte.">
        <RetainerUsageBar usage={usage} />
        {usage.level === "warning" && <p className="mt-3 text-sm text-foreground">Já gastou mais de 75% das horas deste mês.</p>}
        {usage.level === "critical" && <p className="mt-3 text-sm text-destructive">Está perto do limite de horas deste mês.</p>}
        {usage.level === "over" && <p className="mt-3 text-sm text-destructive">Limite ultrapassado: o tempo a mais conta como horas extra a faturar.</p>}
      </IXCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {(["project", "ticket"] as const).map((kind) => {
          const linked = kind === "project" ? linkedProjects.map((p) => ({ id: p.id, label: p.title, href: `/dashboard/delivery/projects/${p.id}` }))
            : linkedTickets.map((t) => ({ id: t.id, label: `${t.ticket_number ? `#${t.ticket_number} ` : ""}${t.subject}`, href: `/dashboard/helpdesk/tickets/${t.id}` }));
          return (
            <IXCard key={kind} title={kind === "project" ? "Projetos" : "Tickets de suporte"}
              actions={<Button variant="outline" size="sm" onClick={() => setAddKind(kind)}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>}>
              {linked.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">{kind === "project" ? "Ainda sem projetos. Crie um para começar a registar horas." : "Ainda sem tickets. Os pedidos do cliente contam para a avença."}</p>
                  <Button size="sm" onClick={() => setAddKind(kind)}><Plus className="mr-1 h-4 w-4" />{kind === "project" ? "Criar ou ligar projeto" : "Criar ou ligar ticket"}</Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">{linked.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 py-2">
                    <Link to={x.href} className="truncate text-sm hover:underline">{x.label}</Link>
                    <Button variant="ghost" size="icon" aria-label={`Desligar ${x.label}`} onClick={() => requestLink(kind, x.id, null, x.label)}><X className="h-4 w-4" /></Button>
                  </li>))}
                </ul>
              )}
            </IXCard>
          );
        })}
      </div>

      <IXCard title="Aprovação do cliente" description="O cliente aprova ou contesta as horas no portal do cliente, em «Projetos & Horas».">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground">
            <li>Aprovadas: <strong>{formatMinutes(approval.approved)}</strong></li>
            <li>A aguardar cliente: <strong>{formatMinutes(approval.pending_client)}</strong></li>
            <li>Contestadas: <strong className={approval.disputed ? "text-destructive" : ""}>{formatMinutes(approval.disputed)}</strong></li>
            <li>Por enviar: <strong>{formatMinutes(approval.submitted)}</strong></li>
          </ul>
          <Button variant="outline" onClick={() => sendApproval.mutate(entries)} disabled={toSend === 0 || sendApproval.isPending || !retainer.company_id}>
            <Send className="mr-2 h-4 w-4" />Enviar {formatMinutes(toSend)} para aprovação
          </Button>
        </div>
      </IXCard>

      <IXCard title="Extrato de horas" description={`${entries.length} registos em ${periodLabel(from, to)}`}
        actions={<Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>}>
        {entriesLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
          : entriesError ? <p className="text-sm text-destructive">Não foi possível carregar os registos.</p>
          : entries.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há tempo registado neste mês.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Projeto / Ticket</TableHead>
                  <TableHead>Pessoa</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Duração</TableHead><TableHead>Conta</TableHead><TableHead>Cliente</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>{entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{e.date.split("-").reverse().join("/")}</TableCell>
                    <TableCell>{e.source === "project" ? "Projeto" : "Suporte"}</TableCell>
                    <TableCell className="max-w-48 truncate" title={e.taskLabel ? `${e.parentLabel} › ${e.taskLabel}` : e.parentLabel}>{e.parentLabel}{e.taskLabel && <span className="block truncate text-xs text-muted-foreground">{e.taskLabel}</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{names?.get(e.userId ?? "") ?? "—"}</TableCell>
                    <TableCell className="max-w-72 truncate" title={e.description ?? ""}>{e.description ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatMinutes(e.minutes)}</TableCell>
                    <TableCell><Badge variant={flagged.get(e.id)?.includes("Extra") || flagged.get(e.id) === "Parcial extra" ? "destructive" : "outline"}>{flagged.get(e.id)}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap"><Badge variant={e.approval === "disputed" ? "destructive" : e.approval === "approved" ? "default" : "outline"} title={e.clientNote ?? undefined}>{APPROVAL_LABEL[e.approval ?? "submitted"]}</Badge>
                      {e.approval === "disputed" && e.clientNote && <span className="block max-w-48 truncate text-xs text-destructive">{e.clientNote}</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.userId === user?.id && (<>
                      <Button variant="ghost" size="icon" aria-label="Corrigir registo" onClick={() => setEditEntry(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Apagar registo" onClick={() => del.mutate({ source: e.source, id: e.id })}><Trash2 className="h-4 w-4" /></Button>
                    </>)}</TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </div>
          )}
      </IXCard>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.retainerId ? "Ligar à avença" : "Desligar da avença"}: {pending?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.minutes == null ? "A contar o tempo já registado..."
                : pending.minutes < 0 ? "Não foi possível contar o tempo já registado."
                : pending.minutes === 0 ? "Ainda não há tempo registado aqui."
                : pending.retainerId ? `${formatMinutes(pending.minutes)} já registadas passam a contar para esta avença, nos meses em que foram feitas.`
                : `${formatMinutes(pending.minutes)} registadas deixam de contar para esta avença.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={pending?.minutes == null || link.isPending}
              onClick={() => { if (pending) link.mutate({ kind: pending.kind, id: pending.id, retainerId: pending.retainerId }); setPending(null); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LogRetainerTimeDialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)} retainer={retainer} entry={editEntry} projects={[]} tickets={[]} />
      <AddWorkItemDialog open={!!addKind} onOpenChange={(o) => !o && setAddKind(null)} kind={addKind ?? "project"}
        companyName={retainer.companies?.name} items={addItems} creating={createItem.isPending}
        onCreate={(title) => addKind && createItem.mutate({ retainer, kind: addKind, title }, { onSuccess: () => setAddKind(null) })}
        onPick={(i) => { if (addKind) requestLink(addKind, i.id, retainer.id, i.label); setAddKind(null); }} />
      <RetainerFormDialog open={editOpen} onOpenChange={setEditOpen} retainer={retainer} />
      <LogRetainerTimeDialog open={logOpen} onOpenChange={setLogOpen} retainer={retainer}
        projects={linkedProjects.map((p) => ({ id: p.id, title: p.title }))}
        tickets={linkedTickets.map((t) => ({ id: t.id, subject: t.subject, ticket_number: t.ticket_number }))} />
    </div>
  );
}
