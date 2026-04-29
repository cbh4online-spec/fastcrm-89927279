import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type FieldPermissionLevel = "hidden" | "view" | "edit";

interface FieldPermissionRow {
  object_key: string;
  role: string;
  field_key: string;
  permission_level: FieldPermissionLevel;
}

/**
 * Hook for resolving per-field product permissions for the current user.
 * Owners, admins and super admins always have full edit access.
 */
export function useProductFieldPermissions() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const roleQuery = useQuery({
    queryKey: ["current-user-workspace-role", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId || !workspaceId) return null;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) return null;
      return (data?.role as string) ?? null;
    },
  });

  const permsQuery = useQuery({
    queryKey: ["field-permissions", "products", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_permissions")
        .select("object_key, role, field_key, permission_level")
        .eq("workspace_id", workspaceId!)
        .eq("object_key", "products");
      if (error) throw error;
      return (data ?? []) as FieldPermissionRow[];
    },
  });

  const role = roleQuery.data ?? null;
  const isPrivileged = role === "owner" || role === "admin";

  const map = useMemo(() => {
    const m = new Map<string, FieldPermissionLevel>();
    if (!role || !permsQuery.data) return m;
    for (const row of permsQuery.data) {
      if (row.role !== role) continue;
      m.set(row.field_key, row.permission_level);
    }
    return m;
  }, [permsQuery.data, role]);

  const getLevel = (field: string): FieldPermissionLevel => {
    if (isPrivileged || !role) return "edit";
    return map.get(field) ?? "edit";
  };

  return {
    role,
    isLoading: roleQuery.isLoading || permsQuery.isLoading,
    getLevel,
    isHidden: (field: string) => getLevel(field) === "hidden",
    isReadOnly: (field: string) => getLevel(field) === "view",
    isEditable: (field: string) => getLevel(field) === "edit",
  };
}
