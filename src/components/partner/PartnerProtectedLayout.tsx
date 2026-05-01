import { Navigate, Outlet } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { PartnerLoadingScreen } from "@/components/partner/PartnerLoadingScreen";

/**
 * Layout-route do Partner Center.
 *
 * - Renderiza-se UMA única vez para todo o portal autenticado.
 * - Centraliza o gate de auth (loading / error / unauthenticated) para que
 *   `PartnerLayout` (header, branding, nav, footer) NÃO seja desmontado
 *   entre páginas (Dashboard ↔ Catálogo ↔ Carrinho…).
 * - As páginas filhas renderizam apenas o seu conteúdo via <Outlet/>.
 */
export function PartnerProtectedLayout() {
  const { loading, error, isAuthenticated, signOut } = usePartnerAuth();

  if (loading) {
    return <PartnerLoadingScreen message="A carregar o Partner Center…" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Não foi possível carregar o portal</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={signOut}>
              Terminar sessão
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/partner/login" replace />;
  }

  return (
    <PartnerLayout>
      <Outlet />
    </PartnerLayout>
  );
}
