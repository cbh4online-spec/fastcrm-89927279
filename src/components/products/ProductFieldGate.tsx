import { ReactNode } from "react";
import { useProductFieldPermissions } from "@/hooks/useProductFieldPermissions";
import { Lock } from "lucide-react";

interface ProductFieldGateProps {
  field: string;
  children: ReactNode;
  /** When `view`, render children inside a wrapper that visually disables them. */
  readOnlyWrapper?: boolean;
}

/**
 * Hides children when the user has `hidden` permission for the field,
 * and renders them disabled (pointer-events: none + opacity) when `view`.
 * For a true read-only experience prefer pairing with `disabled` on the input
 * itself via the `useProductFieldPermissions` hook.
 */
export function ProductFieldGate({
  field,
  children,
  readOnlyWrapper = true,
}: ProductFieldGateProps) {
  const { isHidden, isReadOnly } = useProductFieldPermissions();

  if (isHidden(field)) return null;

  if (isReadOnly(field) && readOnlyWrapper) {
    return (
      <div
        className="relative pointer-events-none opacity-70"
        aria-disabled
        title="Apenas leitura — sem permissão para editar"
      >
        <div className="absolute right-2 top-2 z-10 text-muted-foreground">
          <Lock className="h-3 w-3" />
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
