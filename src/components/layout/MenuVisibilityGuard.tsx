import { useMemo, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { ROUTE_MANIFEST, type RouteEntry } from "@/config/routeManifest";
import { useMenuOverrideMap } from "@/hooks/useWorkspaceMenuOverrides";
import { resolveRouteVisibility } from "@/config/menuOverrides";
import { Button } from "@/components/ui/button";

/**
 * Impede o acesso directo (por URL) a páginas que o Super Admin marcou como
 * "Oculto" ou "Com cadeado" para a workspace activa.
 *
 * Nota: é apenas uma barreira de navegação/UI — a protecção dos dados continua
 * garantida pelas políticas RLS na base de dados.
 */
function matchRoute(pathname: string): RouteEntry | undefined {
  let best: RouteEntry | undefined;
  for (const r of ROUTE_MANIFEST) {
    if (!r.href) continue;
    const base = r.href.split("?")[0];
    if (pathname === base || pathname.startsWith(base + "/")) {
      if (!best || base.length > best.href.split("?")[0].length) best = r;
    }
  }
  return best;
}

export function MenuVisibilityGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { map, isReady, error } = useMenuOverrideMap();

  const state = useMemo(() => {
    // Um super admin a pré-visualizar uma workspace deve ver exactamente o
    // mesmo menu e bloqueios configurados para os restantes utilizadores.
    if (!isReady) return "pending" as const;
    const entry = matchRoute(location.pathname);
    if (!entry) return "visible" as const;
    return resolveRouteVisibility(map, entry);
  }, [isReady, location.pathname, map]);

  if (state === "pending") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center" role="status">
        {error ? (
          <p className="max-w-md text-sm text-destructive">
            Não foi possível validar os acessos desta workspace. Tente atualizar a página.
          </p>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">A validar acessos…</span>
          </>
        )}
      </div>
    );
  }

  if (state === "hidden") {
    return <Navigate to="/dashboard" replace />;
  }

  if (state === "locked") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Secção bloqueada</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta área não está disponível na sua workspace. Contacte o administrador
            para pedir acesso.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/dashboard">Voltar ao painel</a>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
