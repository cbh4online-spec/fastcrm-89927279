import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  type Capability,
  roleHasCapability,
} from "@/lib/permissions/capabilities";

/** Permissões individuais concedidas ao utilizador no workspace activo. */
export function useCapabilityGrants(): Capability[] {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data } = useQuery({
    queryKey: ["capability-grants", wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("workspace_member_capability_grants")
        .select("capability")
        .eq("workspace_id", wsId!)
        .eq("user_id", auth.user.id);
      if (error) return [];
      return (data ?? []).map((r) => r.capability as Capability);
    },
  });
  return data ?? [];
}

/**
 * Verifica se o utilizador actual tem uma capability no workspace activo.
 * Super admins fazem bypass — devolvem sempre `true`.
 */
export function useCapability(cap: Capability): boolean {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { isSuperAdmin: isAppSuperAdmin } = useUserRole();
  const grants = useCapabilityGrants();
  if (isSuperAdmin || isAppSuperAdmin) return true;
  return roleHasCapability(currentWorkspace?.role, cap) || grants.includes(cap);
}

export interface CapabilityHelpers {
  role: ReturnType<typeof useWorkspace>["currentWorkspace"] extends infer W
    ? W extends { role: infer R }
      ? R | null
      : null
    : null;
  isSuperAdmin: boolean;
  can: (cap: Capability) => boolean;
  cannot: (cap: Capability) => boolean;
}

/**
 * Helper agregado para componentes que precisam de testar várias capabilities.
 */
export function useCapabilities(): CapabilityHelpers {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { isSuperAdmin: isAppSuperAdmin } = useUserRole();
  const grants = useCapabilityGrants();
  const elevated = isSuperAdmin || isAppSuperAdmin;
  const role = currentWorkspace?.role ?? null;
  const grantsKey = grants.join(",");

  return useMemo(
    () => {
      const has = (cap: Capability) =>
        elevated || roleHasCapability(role, cap) || grants.includes(cap);
      return {
        role: role as CapabilityHelpers["role"],
        isSuperAdmin: elevated,
        can: has,
        cannot: (cap: Capability) => !has(cap),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, elevated, grantsKey],
  );
}
