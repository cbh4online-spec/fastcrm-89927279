/** Mapeia o estado de uma subscrição Stripe para o contrato (enum renewal_contract_status). */
export type ContractStatus = "active" | "paused" | "cancelled" | "expired";
export interface StripeSubLike {
  status: string;
  cancel_at_period_end?: boolean | null;
  cancel_at?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
}
export function mapStripeSubscription(sub: StripeSubLike): {
  status?: ContractStatus;
  riskHigh: boolean;
  cancelled: boolean;
  cancelScheduledAt: string | null;
  keepNextRenewal: boolean;
} {
  const iso = (t?: number | null) => (t ? new Date(t * 1000).toISOString() : null);
  const s = sub.status;
  if (s === "canceled" || s === "incomplete_expired") {
    return { status: "cancelled", riskHigh: false, cancelled: true, cancelScheduledAt: null, keepNextRenewal: false };
  }
  const scheduled = sub.cancel_at_period_end || sub.cancel_at ? iso(sub.cancel_at) ?? "period_end" : null;
  if (s === "active" || s === "trialing") return { status: "active", riskHigh: !!scheduled, cancelled: false, cancelScheduledAt: scheduled, keepNextRenewal: !scheduled };
  if (s === "paused") return { status: "paused", riskHigh: !!scheduled, cancelled: false, cancelScheduledAt: scheduled, keepNextRenewal: !scheduled };
  if (s === "past_due" || s === "unpaid") return { riskHigh: true, cancelled: false, cancelScheduledAt: scheduled, keepNextRenewal: true };
  return { riskHigh: false, cancelled: false, cancelScheduledAt: scheduled, keepNextRenewal: true };
}
