import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserAdminRow {
  id: string;             // profile.id
  user_id: string;        // auth user_id
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
  isSuperAdmin: boolean;
  workspaces: { workspace_id: string; role: string }[];
  workspaceCount: number;
}

export interface UsersAdminData {
  rows: UserAdminRow[];
  total: number;
  superAdmins: number;
  active: number;
  suspended: number;
  withWorkspace: number;
  partialErrors: string[];
}

async function fetchUsersAdmin(): Promise<UsersAdminData> {
  const errors: string[] = [];

  const [profilesRes, rolesRes, membersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, user_id, email, full_name, avatar_url, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("workspace_members").select("user_id, workspace_id, role"),
  ]);

  if (profilesRes.error) {
    console.warn("[useUsersAdmin] profiles:", profilesRes.error.message);
    errors.push("profiles");
  }
  if (rolesRes.error) {
    console.warn("[useUsersAdmin] user_roles:", rolesRes.error.message);
    errors.push("user_roles");
  }
  if (membersRes.error) {
    console.warn("[useUsersAdmin] workspace_members:", membersRes.error.message);
    errors.push("workspace_members");
  }

  const profiles = profilesRes.data ?? [];
  const roles = rolesRes.data ?? [];
  const members = membersRes.data ?? [];

  // user_roles.user_id refere profile.id (padrão do projeto)
  const superSet = new Set(
    roles.filter((r: any) => r?.role === "super_admin").map((r: any) => r.user_id)
  );

  // workspace_members.user_id refere auth.user_id
  const wsByUser = new Map<string, { workspace_id: string; role: string }[]>();
  members.forEach((m: any) => {
    if (!m?.user_id) return;
    const arr = wsByUser.get(m.user_id) ?? [];
    arr.push({ workspace_id: m.workspace_id, role: m.role });
    wsByUser.set(m.user_id, arr);
  });

  const rows: UserAdminRow[] = profiles.map((p: any) => {
    const memberships = wsByUser.get(p.user_id) ?? [];
    return {
      id: p.id,
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      status: p.status,
      created_at: p.created_at,
      isSuperAdmin: superSet.has(p.id),
      workspaces: memberships,
      workspaceCount: memberships.length,
    };
  });

  return {
    rows,
    total: rows.length,
    superAdmins: rows.filter((r) => r.isSuperAdmin).length,
    active: rows.filter((r) => r.status === "active" || r.status === null).length,
    suspended: rows.filter((r) => r.status === "suspended").length,
    withWorkspace: rows.filter((r) => r.workspaceCount > 0).length,
    partialErrors: errors,
  };
}

export function useUsersAdmin() {
  return useQuery({
    queryKey: ["wsv2-users-admin"],
    queryFn: fetchUsersAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
