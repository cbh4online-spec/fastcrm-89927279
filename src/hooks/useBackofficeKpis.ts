import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BackofficeKpis {
  workspaces: number;
  workspacesNew30d: number;
  users: number;
  activeSubs: number;
  mrr: number;
  aiCalls30d: number;
  alertsOpen: number;
  /** Lista de queries que falharam (para diagnóstico no UI). */
  partialErrors: string[];
}

const ZERO: Omit<BackofficeKpis, "partialErrors"> = {
  workspaces: 0,
  workspacesNew30d: 0,
  users: 0,
  activeSubs: 0,
  mrr: 0,
  aiCalls30d: 0,
  alertsOpen: 0,
};

/**
 * Wrapper que captura falhas individuais (RLS, rede, etc.) sem rebentar com o
 * Promise.all global. Devolve `null` em erro e regista o label em `errors`.
 * Recebe um thenable (PostgrestBuilder) e força a resolução via Promise.resolve.
 */
async function safe<T>(label: string, builder: PromiseLike<T>, errors: string[]): Promise<T | null> {
  try {
    const res = await Promise.resolve(builder);
    // Postgrest devolve { data, error, count } — propagar erro lógico também.
    const anyRes = res as any;
    if (anyRes && anyRes.error) {
      console.warn(`[useBackofficeKpis] ${label} erro:`, anyRes.error?.message ?? anyRes.error);
      errors.push(label);
    }
    return res;
  } catch (e: any) {
    console.warn(`[useBackofficeKpis] ${label} exceção:`, e?.message ?? e);
    errors.push(label);
    return null;
  }
}

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function fetchBackofficeKpis(): Promise<BackofficeKpis> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const errors: string[] = [];

  const [
    workspacesAll,
    workspacesNew,
    usersAll,
    subs,
    mrrRows,
    aiLogs,
    alerts,
  ] = await Promise.all([
    safe("workspaces",
      supabase.from("workspaces").select("id", { count: "exact", head: true }), errors),
    safe("workspaces_new_30d",
      supabase.from("workspaces").select("id", { count: "exact", head: true }).gte("created_at", since), errors),
    safe("profiles",
      supabase.from("profiles").select("id", { count: "exact", head: true }), errors),
    safe("workspace_subscriptions",
      supabase.from("workspace_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"), errors),
    safe("subscriptions_mrr",
      supabase.from("subscriptions").select("mrr_amount").eq("status", "active"), errors),
    safe("ai_usage_logs",
      supabase.from("ai_usage_logs").select("id", { count: "exact", head: true }).gte("created_at", since), errors),
    safe("workspace_alerts",
      supabase.from("workspace_alerts").select("id", { count: "exact", head: true }).eq("status", "open"), errors),
  ]);

  const mrrData = (mrrRows as any)?.data;
  const mrr = Array.isArray(mrrData)
    ? mrrData.reduce((acc: number, r: any) => acc + toNumber(r?.mrr_amount), 0)
    : 0;

  return {
    ...ZERO,
    workspaces: (workspacesAll as any)?.count ?? 0,
    workspacesNew30d: (workspacesNew as any)?.count ?? 0,
    users: (usersAll as any)?.count ?? 0,
    activeSubs: (subs as any)?.count ?? 0,
    mrr,
    aiCalls30d: (aiLogs as any)?.count ?? 0,
    alertsOpen: (alerts as any)?.count ?? 0,
    partialErrors: errors,
  };
}

export function useBackofficeKpis() {
  return useQuery({
    queryKey: ["backoffice-kpis-v2"],
    queryFn: fetchBackofficeKpis,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
