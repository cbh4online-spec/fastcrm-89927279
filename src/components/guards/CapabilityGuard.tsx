import { ReactNode } from "react";
import { useCapability } from "@/hooks/useCapability";
import { AccessDenied } from "./AccessDenied";
import type { Capability } from "@/lib/permissions/capabilities";

interface CapabilityGuardProps {
  need: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Bloqueia a renderização dos filhos se o utilizador não tiver a capability.
 * Super admins fazem bypass automático via `useCapability`.
 */
export function CapabilityGuard({
  need,
  children,
  fallback,
}: CapabilityGuardProps) {
  const allowed = useCapability(need);
  if (allowed) return <>{children}</>;
  return <>{fallback ?? <AccessDenied capability={need} />}</>;
}
