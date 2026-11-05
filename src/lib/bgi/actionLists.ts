/**
 * Listas de ação do Crescimento (Fase 3). Os dados vêm de `bgi_action_lists`
 * (servidor); aqui só ficam limites, mensagens assistidas e construção de tarefas.
 */

export type ActionKind = "collect" | "reactivate" | "upsell";
interface Base { id: string; type: "company" | "contact"; name: string; phone: string | null; amount: number }
export interface CollectItem extends Base { invoices: number; max_overdue_days: number }
export interface ReactivateItem extends Base { last_date: string; idle_days: number; avg_gap_days: number | null }
export interface UpsellItem extends Base { invoices: number; avg_ticket: number }
export interface ActionLists { today: string; collect: CollectItem[]; reactivate: ReactivateItem[]; upsell: UpsellItem[] }
export type ActionItem = CollectItem | ReactivateItem | UpsellItem;

/** Limites espelhados no SQL de `bgi_action_lists`. */
export const ACTION_RULES = { collectMinOverdueDays: 60, reactivateMinIdleDays: 60, reactivateHabitMultiplier: 2, upsellMaxAvgTicket: 150, upsellMinInvoices: 3 } as const;
export const MAX_BULK_TASKS = 50;
export const TASK_DUE_DAYS = 3;

export const ACTION_TITLE: Record<ActionKind, string> = {
  collect: "Prioridade 1 — Cobrar saldos em atraso",
  reactivate: "Prioridade 2 — Reativar clientes parados",
  upsell: "Prioridade 3 — Aumentar o valor das compras",
};

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v || 0);
const firstName = (n: string) => (n.split(/\s+/)[0] || n);

/** Mensagem sugerida (o utilizador revê e envia à mão). */
export function suggestedMessage(kind: ActionKind, item: ActionItem): string {
  const n = firstName(item.name);
  if (kind === "collect") return `Olá ${n}, tudo bem? Verificámos que existe um valor em aberto de ${eur(item.amount)}. Pode confirmar-nos a previsão de pagamento? Se já tiver pago, envie-nos o comprovativo, por favor. Obrigado!`;
  if (kind === "reactivate") return `Olá ${n}, tudo bem? Já há algum tempo que não falamos. Temos novidades que podem interessar-lhe — quer que lhe envie as sugestões deste mês?`;
  return `Olá ${n}, tudo bem? Preparámos condições especiais para encomendas em maior quantidade e packs. Quer que lhe envie uma proposta?`;
}

/** Título determinístico — é também a chave de deduplicação das tarefas pendentes. */
export function taskTitle(kind: ActionKind, item: ActionItem): string {
  if (kind === "collect") return `Cobrar saldo em atraso — ${item.name}`;
  if (kind === "reactivate") return `Reativar cliente parado — ${item.name}`;
  return `Propor pack / maior quantidade — ${item.name}`;
}

export function taskDescription(kind: ActionKind, item: ActionItem): string {
  if (kind === "collect") { const c = item as CollectItem; return `Saldo vencido de ${eur(c.amount)} em ${c.invoices} fatura(s); maior atraso de ${c.max_overdue_days} dias. (Crescimento → Ações)`; }
  if (kind === "reactivate") { const r = item as ReactivateItem; return `Sem compras há ${r.idle_days} dias (costuma comprar a cada ${r.avg_gap_days ?? "—"} dias). Valor anual: ${eur(r.amount)}. (Crescimento → Ações)`; }
  const u = item as UpsellItem; return `${u.invoices} faturas no período com valor médio de ${eur(u.avg_ticket)}. (Crescimento → Ações)`;
}

/** Devolve apenas os itens sem tarefa pendente com o mesmo título, limitados ao lote máximo. */
export function filterNewTasks<T extends { title: string; related_id: string }>(rows: T[], existing: { title: string; related_id: string }[]): T[] {
  const seen = new Set(existing.map((e) => `${e.related_id}|${e.title}`));
  const out: T[] = [];
  for (const r of rows) {
    const k = `${r.related_id}|${r.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= MAX_BULK_TASKS) break;
  }
  return out;
}
