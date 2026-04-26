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
}

async function fetchBackofficeKpis(): Promise<BackofficeKpis> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [
    workspacesAll,
    workspacesNew,
    usersAll,
    subs,
    mrrRows,
    aiLogs,
    alerts,
  ] = await Promise.all([
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("workspaces").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("workspace_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("mrr_amount").eq("status", "active"),
    supabase.from("ai_usage_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("workspace_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const mrr = (mrrRows.data ?? []).reduce(
    (acc: number, r: any) => acc + (Number(r?.mrr_amount) || 0),
    0
  );

  return {
    workspaces: workspacesAll.count ?? 0,
    workspacesNew30d: workspacesNew.count ?? 0,
    users: usersAll.count ?? 0,
    activeSubs: subs.count ?? 0,
    mrr,
    aiCalls30d: aiLogs.count ?? 0,
    alertsOpen: alerts.count ?? 0,
  };
}

export function useBackofficeKpis() {
  return useQuery({
    queryKey: ["backoffice-kpis-v2"],
    queryFn: fetchBackofficeKpis,
    staleTime: 60_000,
  });
}
