import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook read-only para o Backoffice V2 — Billing/Subscrições.
 * Agrega workspace_subscriptions + workspaces e calcula MRR estimado
 * a partir de uma tabela de preços por plano (não há coluna mrr na BD).
 *
 * Resiliente: se uma das queries falhar, devolve dados parciais e
 * lista as falhas em `partialErrors` para o componente apresentar.
 */

export type BillingPlan = "free" | "basic" | "pro" | "agency" | string;
export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete"
  | string;

// Preço mensal (EUR) por plano. Usado para estimar MRR quando não há valor real.
export const PLAN_PRICE_EUR: Record<string, number> = {
  free: 0,
  basic: 19,
  pro: 49,
  agency: 149,
};

export const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  agency: "Agency",
};

export interface BillingRow {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string | null;
  plan: BillingPlan;
  status: BillingStatus;
  mrr_eur: number;
  mrr_is_estimate: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingAdminData {
  rows: BillingRow[];
  totals: {
    mrr: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    arpa: number;
    risk: number; // MRR em risco (past_due + cancel_at_period_end)
  };
  planMix: Array<{ plan: string; count: number; mrr: number }>;
  partialErrors: string[];
}

async function fetchBillingAdmin(): Promise<BillingAdminData> {
  const partialErrors: string[] = [];

  const [subsRes, wsRes] = await Promise.all([
    supabase
      .from("workspace_subscriptions")
      .select(
        "id, workspace_id, plan, status, stripe_customer_id, current_period_end, cancel_at_period_end, trial_ends_at, created_at, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("workspaces")
      .select("id, name, slug")
      .limit(2000),
  ]);

  if (subsRes.error) partialErrors.push("workspace_subscriptions");
  if (wsRes.error) partialErrors.push("workspaces");

  const wsMap = new Map<string, { name: string; slug: string | null }>();
  (wsRes.data ?? []).forEach((w: any) =>
    wsMap.set(w.id, { name: w.name ?? "—", slug: w.slug ?? null })
  );

  const rows: BillingRow[] = (subsRes.data ?? []).map((s: any) => {
    const ws = wsMap.get(s.workspace_id);
    const planKey = String(s.plan ?? "free").toLowerCase();
    const status = String(s.status ?? "active").toLowerCase();
    const mrr =
      status === "active" || status === "trialing"
        ? PLAN_PRICE_EUR[planKey] ?? 0
        : 0;
    return {
      id: s.id,
      workspace_id: s.workspace_id,
      workspace_name: ws?.name ?? "Workspace removido",
      workspace_slug: ws?.slug ?? null,
      plan: planKey,
      status,
      mrr_eur: mrr,
      mrr_is_estimate: true,
      trial_ends_at: s.trial_ends_at,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      stripe_customer_id: s.stripe_customer_id,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  });

  const active = rows.filter((r) => r.status === "active").length;
  const trialing = rows.filter((r) => r.status === "trialing").length;
  const pastDue = rows.filter((r) => r.status === "past_due").length;
  const canceled = rows.filter((r) => r.status === "canceled").length;
  const mrr = rows.reduce((sum, r) => sum + r.mrr_eur, 0);
  const paying = rows.filter(
    (r) => (r.status === "active" || r.status === "trialing") && r.mrr_eur > 0
  );
  const arpa = paying.length ? mrr / paying.length : 0;
  const risk = rows
    .filter((r) => r.status === "past_due" || r.cancel_at_period_end)
    .reduce((sum, r) => sum + r.mrr_eur, 0);

  const mixMap = new Map<string, { count: number; mrr: number }>();
  rows.forEach((r) => {
    const cur = mixMap.get(r.plan) ?? { count: 0, mrr: 0 };
    cur.count += 1;
    cur.mrr += r.mrr_eur;
    mixMap.set(r.plan, cur);
  });
  const planMix = Array.from(mixMap.entries())
    .map(([plan, v]) => ({ plan, ...v }))
    .sort((a, b) => b.count - a.count);

  return {
    rows,
    totals: { mrr, active, trialing, pastDue, canceled, arpa, risk },
    planMix,
    partialErrors,
  };
}

export function useBillingAdmin() {
  return useQuery({
    queryKey: ["backoffice-v2", "billing"],
    queryFn: fetchBillingAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
