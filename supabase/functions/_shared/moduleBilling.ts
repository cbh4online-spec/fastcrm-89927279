export type ModuleBilling = "monthly" | "one_time";

export interface BillableModule {
  price_eur: number | null;
  one_time_price_eur: number | null;
  stripe_price_id: string | null;
  stripe_one_time_price_id: string | null;
}

export type CheckoutPlan =
  | { ok: true; mode: "subscription" | "payment"; billingType: "subscription" | "one_time"; priceId: string | null; unitAmountCents: number }
  | { ok: false; code: "price_not_configured" };

/** Decide como cobrar um módulo. Sem preço configurado → falha (nunca cobra 0 €). */
export function planModuleCheckout(mod: BillableModule, billing: ModuleBilling): CheckoutPlan {
  const isOneTime = billing === "one_time";
  const priceId = isOneTime ? mod.stripe_one_time_price_id : mod.stripe_price_id;
  const amount = Number(isOneTime ? mod.one_time_price_eur : mod.price_eur) || 0;
  if (!priceId && amount <= 0) return { ok: false, code: "price_not_configured" };
  return {
    ok: true,
    mode: isOneTime ? "payment" : "subscription",
    billingType: isOneTime ? "one_time" : "subscription",
    priceId: priceId || null,
    unitAmountCents: Math.round(amount * 100),
  };
}

/** Um módulo com pagamento único ativo nunca expira; subscrição só enquanto ativa. */
export function isModuleAccessActive(row: { status: string; billing_type?: string | null; current_period_end?: string | null }, now = new Date()): boolean {
  if (row.status !== "active" && row.status !== "trial") return false;
  if (row.billing_type === "one_time") return true;
  if (!row.current_period_end) return true;
  return new Date(row.current_period_end).getTime() > now.getTime();
}
