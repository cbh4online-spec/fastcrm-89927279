import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PageElementKind } from "@/config/pageElements";
import { usePageElementVisibility } from "@/hooks/usePageElementVisibility";

interface PageElementGateProps {
  kind: PageElementKind;
  id: string;
  /** Rota alvo (opcional; por defeito resolvida do pathname actual). */
  routeKey?: string;
  children: ReactNode;
  /** Texto do tooltip quando o elemento está bloqueado. */
  lockedHint?: string;
}

/**
 * Camada de apresentação para o 4.º nível de visibilidade por workspace.
 * - "hidden" → não renderiza
 * - "locked" → renderiza inerte, com cadeado e tooltip
 * Não substitui RLS.
 */
export function PageElementGate({
  kind,
  id,
  routeKey,
  children,
  lockedHint = "Bloqueado pelo administrador",
}: PageElementGateProps) {
  const { elementState } = usePageElementVisibility(routeKey);
  const state = elementState(kind, id);

  if (state === "hidden") return null;
  if (state !== "locked") return <>{children}</>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative inline-flex cursor-not-allowed opacity-60">
            <span className="pointer-events-none select-none" aria-disabled="true">
              {children}
            </span>
            <Lock className="absolute -right-1 -top-1 h-3 w-3 text-muted-foreground" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent>{lockedHint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
