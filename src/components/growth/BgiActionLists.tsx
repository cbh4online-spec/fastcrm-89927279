import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ListPlus, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBgiActionLists } from "@/hooks/useBgiExecutiveDiagnostics";
import { useWhatsAppStopSignals } from "@/hooks/useWhatsAppStopSignals";
import { resolveWhatsAppAvailability } from "@/lib/whatsapp/availability";
import { openWhatsAppChat } from "@/lib/whatsapp/openWhatsAppChat";
import { DIAG_RANGES, entityPath, resolveDiagRange, type DiagRange } from "@/lib/bgi/executiveDiagnostics";
import {
  ACTION_TITLE, MAX_BULK_TASKS, TASK_DUE_DAYS, filterNewTasks, suggestedMessage, taskDescription, taskTitle,
  type ActionItem, type ActionKind, type CollectItem, type ReactivateItem, type UpsellItem,
} from "@/lib/bgi/actionLists";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
const lisbonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
const PAGE = 20;

/** Cria tarefas sem duplicar pendentes (mesmo cliente + mesmo motivo). */
export function useCreateActionTasks() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return async (kind: ActionKind, items: ActionItem[]) => {
    const wsId = currentWorkspace?.id;
    if (!wsId || items.length === 0) return 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada");
    const due = new Date(Date.now() + TASK_DUE_DAYS * 86_400_000).toISOString();
    const rows = items.slice(0, MAX_BULK_TASKS * 2).map((i) => ({
      workspace_id: wsId, created_by: user.id, assigned_to: user.id, related_type: i.type, related_id: i.id,
      title: taskTitle(kind, i), description: taskDescription(kind, i), status: "pending", priority: kind === "collect" ? "high" : "medium", due_at: due,
    }));
    const { data: existing, error: readErr } = await supabase.from("tasks").select("title, related_id")
      .eq("workspace_id", wsId).eq("status", "pending").in("related_id", rows.map((r) => r.related_id)).in("title", rows.map((r) => r.title));
    if (readErr) throw readErr;
    const fresh = filterNewTasks(rows, (existing ?? []) as { title: string; related_id: string }[]);
    if (fresh.length) {
      const { error } = await supabase.from("tasks").insert(fresh as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }
    return fresh.length;
  };
}

function WhatsAppAction({ kind, item }: { kind: ActionKind; item: ActionItem }) {
  const { currentWorkspace } = useWorkspace();
  const [armed, setArmed] = useState(false);
  const signals = useWhatsAppStopSignals(currentWorkspace?.id, armed ? item.phone : null);
  const avail = resolveWhatsAppAvailability({ phone: item.phone, optedOut: signals.optedOut, consentRevoked: signals.consentRevoked, checksPending: !armed || signals.pending });

  if (!item.phone || avail.status === "invalid_number") {
    return <Tooltip><TooltipTrigger asChild><span><Button size="sm" variant="ghost" disabled aria-label="Sem telefone válido"><MessageCircle className="h-4 w-4" /></Button></span></TooltipTrigger><TooltipContent>Sem telefone válido</TooltipContent></Tooltip>;
  }
  if (!armed) {
    return <Button size="sm" variant="ghost" onClick={() => setArmed(true)} aria-label={`Verificar WhatsApp de ${item.name}`} title="Verificar opt-out e preparar mensagem"><ShieldCheck className="h-4 w-4" /></Button>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="sm" variant="ghost" disabled={!avail.canOpen} aria-label={`Abrir WhatsApp com ${item.name}`}
            onClick={() => { if (!openWhatsAppChat(avail.number!, suggestedMessage(kind, item))) toast.error("Número inválido"); }}>
            {avail.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4 text-primary" />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{avail.canOpen ? "Abrir WhatsApp com mensagem sugerida (envio manual)" : avail.label}</TooltipContent>
    </Tooltip>
  );
}

interface Col<T> { head: string; cell: (i: T) => React.ReactNode; right?: boolean }

function ActionList<T extends ActionItem>({ kind, items, summary, cols }: { kind: ActionKind; items: T[]; summary: string; cols: Col<T>[] }) {
  const [shown, setShown] = useState(PAGE);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const create = useCreateActionTasks();
  const visible = items.slice(0, shown);

  const run = async (list: ActionItem[], key: string) => {
    setBusy(key);
    try {
      const n = await create(kind, list);
      toast.success(n === 0 ? "Já existem tarefas pendentes para estes clientes" : `${n} tarefa(s) criada(s)`);
      setSel(new Set());
    } catch (e) {
      toast.error((e as Error)?.message || "Não foi possível criar as tarefas");
    } finally { setBusy(null); }
  };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < MAX_BULK_TASKS) n.add(id); else toast.info(`Máximo de ${MAX_BULK_TASKS} por lote`); return n; });

  return (
    <IXCard title={ACTION_TITLE[kind]} description={summary}
      actions={sel.size > 0 ? (
        <Button size="sm" disabled={!!busy} onClick={() => run(items.filter((i) => sel.has(i.id)), "bulk")}>
          {busy === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />} Criar {sel.size} tarefa(s)
        </Button>
      ) : undefined}>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cliente nesta lista. Bom sinal.</p> : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2 w-8"><span className="sr-only">Selecionar</span></th>
                  <th className="py-2 pr-3">Cliente</th>
                  {cols.map((c) => <th key={c.head} className={`py-2 pr-3 ${c.right ? "text-right" : ""}`}>{c.head}</th>)}
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-2"><Checkbox checked={sel.has(i.id)} onCheckedChange={() => toggle(i.id)} aria-label={`Selecionar ${i.name}`} /></td>
                    <td className="py-2 pr-3"><Link className="text-primary hover:underline" to={entityPath(i.type, i.id)}>{i.name}</Link></td>
                    {cols.map((c) => <td key={c.head} className={`py-2 pr-3 tabular-nums ${c.right ? "text-right" : ""}`}>{c.cell(i)}</td>)}
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <WhatsAppAction kind={kind} item={i} />
                        <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run([i], i.id)} aria-label={`Criar tarefa para ${i.name}`} title="Criar tarefa (prazo 3 dias)">
                          {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length > shown && <Button size="sm" variant="outline" onClick={() => setShown((s) => s + PAGE)}>Ver mais ({items.length - shown})</Button>}
        </div>
      )}
    </IXCard>
  );
}

export function BgiActionLists() {
  const [range, setRange] = useState<DiagRange>("ytd");
  const { start, end } = useMemo(() => resolveDiagRange(range, lisbonToday()), [range]);
  const { data, isLoading, error, refetch } = useBgiActionLists(start, end);
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + (x.amount || 0), 0);
  const cap = (xs: unknown[]) => (xs.length >= 100 ? " (os 100 maiores)" : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período das ações">
        {DIAG_RANGES.map((r) => (
          <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} className="rounded-full" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Button>
        ))}
        <span className="text-xs text-muted-foreground">O período afeta a Prioridade 3; cobranças e clientes parados são sempre calculados até hoje.</span>
      </div>
      {isLoading && <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> A preparar listas de ação…</div>}
      {error && (
        <IXCard><div role="alert" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-destructive">Não foi possível preparar as listas de ação.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div></IXCard>
      )}
      {data && (
        <>
          <ActionList<CollectItem> kind="collect" items={data.collect}
            summary={`${data.collect.length} clientes${cap(data.collect)} · ${eur(sum(data.collect))} vencidos há mais de 60 dias`}
            cols={[
              { head: "Saldo", right: true, cell: (i) => eur(i.amount) },
              { head: "Faturas", right: true, cell: (i) => i.invoices },
              { head: "Maior atraso", right: true, cell: (i) => <span className="text-destructive">{i.max_overdue_days} dias</span> },
            ]} />
          <ActionList<ReactivateItem> kind="reactivate" items={data.reactivate}
            summary={`${data.reactivate.length} clientes${cap(data.reactivate)} · ${eur(sum(data.reactivate))} de valor anual em risco`}
            cols={[
              { head: "Parado há", right: true, cell: (i) => `${i.idle_days} dias` },
              { head: "Ritmo habitual", right: true, cell: (i) => (i.avg_gap_days != null ? `${i.avg_gap_days} dias` : "—") },
              { head: "Valor anual", right: true, cell: (i) => eur(i.amount) },
            ]} />
          <ActionList<UpsellItem> kind="upsell" items={data.upsell}
            summary={`${data.upsell.length} clientes frequentes${cap(data.upsell)} com faturas abaixo de 150 € em média`}
            cols={[
              { head: "Faturas", right: true, cell: (i) => i.invoices },
              { head: "Valor médio", right: true, cell: (i) => eur(i.avg_ticket) },
              { head: "Total", right: true, cell: (i) => eur(i.amount) },
            ]} />
        </>
      )}
    </div>
  );
}
