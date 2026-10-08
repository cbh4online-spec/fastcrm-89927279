/**
 * Regras puras do webhook de pagamentos da loja (sem I/O, testáveis em Vitest).
 * Eventos tratados: checkout.session.completed, .async_payment_succeeded, .async_payment_failed.
 */
export const STORE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
] as const;

/** Estados a partir dos quais uma encomenda pode passar a paga/falhada. */
export const PAYABLE_FROM_STATUSES = ["pending"] as const;

export interface SessionFacts {
  id: string;
  mode?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
}

export interface OrderFacts {
  id: string;
  workspace_id: string;
  status: string;
  total: number | null;
  currency: string | null;
  stripe_session_id: string | null;
}

export type WebhookAction = "mark_paid" | "keep_pending" | "mark_failed" | "ignore";

export function decideAction(eventType: string, session: SessionFacts): WebhookAction {
  if (session.mode && session.mode !== "payment") return "ignore";
  switch (eventType) {
    case "checkout.session.completed":
      return session.payment_status === "paid" ? "mark_paid" : "keep_pending";
    case "checkout.session.async_payment_succeeded":
      return session.payment_status === "paid" ? "mark_paid" : "ignore";
    case "checkout.session.async_payment_failed":
      return "mark_failed";
    default:
      return "ignore";
  }
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Confirma que a sessão pertence a esta encomenda e workspace e que montante/moeda batem. */
export function validateSessionAgainstOrder(
  session: SessionFacts,
  order: OrderFacts,
  workspaceId: string,
): ValidationResult {
  if (order.workspace_id !== workspaceId) return { ok: false, reason: "workspace_mismatch" };
  if (session.metadata?.workspace_id !== workspaceId) return { ok: false, reason: "metadata_workspace_mismatch" };
  if (session.metadata?.store_order_id && session.metadata.store_order_id !== order.id) {
    return { ok: false, reason: "order_mismatch" };
  }
  if (order.stripe_session_id && order.stripe_session_id !== session.id) {
    return { ok: false, reason: "session_mismatch" };
  }
  if (typeof session.amount_total !== "number" || typeof order.total !== "number") {
    return { ok: false, reason: "amount_missing" };
  }
  if (session.amount_total !== toMinorUnits(order.total)) return { ok: false, reason: "amount_mismatch" };
  if ((session.currency || "").toLowerCase() !== (order.currency || "").toLowerCase()) {
    return { ok: false, reason: "currency_mismatch" };
  }
  return { ok: true };
}

/** Transições permitidas — nunca sobrescreve uma encomenda já paga. */
export function canTransition(from: string, action: WebhookAction): boolean {
  if (action === "mark_paid" || action === "mark_failed") {
    return (PAYABLE_FROM_STATUSES as readonly string[]).includes(from);
  }
  return false;
}
