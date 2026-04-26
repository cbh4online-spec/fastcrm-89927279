import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceAdminRow {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  company_name: string | null;
  billing_email: string | null;
  region: string | null;
  created_at: string;
  owner_id: string | null;
  membersCount: number;
}

export interface WorkspacesAdminData {
  rows: WorkspaceAdminRow[];
  total: number;
  active: number;
  suspended: number;
  trial: number;
  new30d: number;
  partialErrors: string[];
}

async function fetchWorkspacesAdmin(): Promise<WorkspacesAdminData> {
  const errors: string[] = [];
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  // 1) Workspaces
  const { data: wsData, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, slug, status, company_name, billing_email, region, created_at, owner_id")
    .order("created_at", { ascending: false })
    .limit(500);

  if (wsErr) {
    console.warn("[useWorkspacesAdmin] workspaces:", wsErr.message);
    errors.push("workspaces");
  }
  const ws = wsData ?? [];

  // 2) Members aggregate (uma query, contagem em memória)
  const { data: membersData, error: mErr } = await supabase
    .from("workspace_members")
    .select("workspace_id");

  if (mErr) {
    console.warn("[useWorkspacesAdmin] workspace_members:", mErr.message);
    errors.push("workspace_members");
  }
  const membersByWs = new Map<string, number>();
  (membersData ?? []).forEach((m: any) => {
    if (!m?.workspace_id) return;
    membersByWs.set(m.workspace_id, (membersByWs.get(m.workspace_id) ?? 0) + 1);
  });

  const rows: WorkspaceAdminRow[] = ws.map((w: any) => ({
    id: w.id,
    name: w.name ?? "—",
    slug: w.slug,
    status: w.status,
    company_name: w.company_name,
    billing_email: w.billing_email,
    region: w.region,
    created_at: w.created_at,
    owner_id: w.owner_id,
    membersCount: membersByWs.get(w.id) ?? 0,
  }));

  return {
    rows,
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    suspended: rows.filter((r) => r.status === "suspended").length,
    trial: rows.filter((r) => r.status === "trial").length,
    new30d: rows.filter((r) => r.created_at >= since).length,
    partialErrors: errors,
  };
}

export function useWorkspacesAdmin() {
  return useQuery({
    queryKey: ["wsv2-workspaces-admin"],
    queryFn: fetchWorkspacesAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
