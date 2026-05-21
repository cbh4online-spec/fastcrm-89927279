import { useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  type Capability,
  roleHasCapability,
} from "@/lib/permissions/capabilities";

/**
 * Verifica se o utilizador actual tem uma capability no workspace activo.
 * Super admins fazem bypass — devolvem sempre `true`.
 */
export function useCapability(cap: Capability): boolean {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { isSuperAdmin: isAppSuperAdmin } = useUserRole();
  if (isSuperAdmin || isAppSuperAdmin) return true;
  return roleHasCapability(currentWorkspace?.role, cap);
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
  const elevated = isSuperAdmin || isAppSuperAdmin;
  const role = currentWorkspace?.role ?? null;

  return useMemo(
    () => ({
      role: role as CapabilityHelpers["role"],
      isSuperAdmin: elevated,
      can: (cap: Capability) =>
        elevated ? true : roleHasCapability(role, cap),
      cannot: (cap: Capability) =>
        elevated ? false : !roleHasCapability(role, cap),
    }),
    [role, elevated],
  );
}
