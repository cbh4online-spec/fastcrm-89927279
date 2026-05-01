import { lazy, Suspense } from "react";
import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import { PartnerCartProvider } from "@/contexts/PartnerCartContext";
import { PartnerAuthProvider } from "@/contexts/PartnerAuthContext";
import { PartnerLoadingScreen } from "@/components/partner/PartnerLoadingScreen";
import { PartnerProtectedLayout } from "@/components/partner/PartnerProtectedLayout";

const PartnerLoginPage = lazy(() => import("@/pages/partner/PartnerLoginPage"));
const PartnerDashboardPage = lazy(() => import("@/pages/partner/PartnerDashboardPage"));
const PartnerCatalogPage = lazy(() => import("@/pages/partner/PartnerCatalogPage"));
const PartnerCartPage = lazy(() => import("@/pages/partner/PartnerCartPage"));
const PartnerCheckoutPage = lazy(() => import("@/pages/partner/PartnerCheckoutPage"));
const PartnerOrdersPage = lazy(() => import("@/pages/partner/PartnerOrdersPage"));
const PartnerOrderDetailPage = lazy(() => import("@/pages/partner/PartnerOrderDetailPage"));
const PartnerAccountPage = lazy(() => import("@/pages/partner/PartnerAccountPage"));

/**
 * Wrapper de Suspense apenas para o conteúdo das rotas autenticadas.
 *
 * Fica DENTRO do `PartnerProtectedLayout`, abaixo do header/nav, para que
 * o lazy-load de uma nova página só substitua o conteúdo principal —
 * o chrome do portal (header, branding, cart badge) permanece montado.
 */
function PartnerSuspenseOutlet() {
  return (
    <Suspense fallback={<PartnerLoadingScreen message="A carregar…" inline />}>
      <Outlet />
    </Suspense>
  );
}

export function PartnerRoutes() {
  return (
    // Auth + Cart providers ficam por fora das <Routes> para que NUNCA sejam
    // desmontados em mudanças de rota. Isto preserva sessão, perfil de
    // parceiro e estado do carrinho durante toda a navegação.
    <PartnerAuthProvider>
      <PartnerCartProvider>
        <Routes>
          {/* Rota pública: o Suspense aqui é necessário porque a página de
              login é lazy e está fora do layout autenticado. */}
          <Route
            path="login"
            element={
              <Suspense fallback={<PartnerLoadingScreen message="A preparar o portal…" />}>
                <PartnerLoginPage />
              </Suspense>
            }
          />

          {/* Layout-route: PartnerProtectedLayout valida auth UMA vez e renderiza
              PartnerLayout (header/nav/footer) persistente com <Outlet/> dentro. */}
          <Route element={<PartnerProtectedLayout />}>
            <Route element={<PartnerSuspenseOutlet />}>
              <Route path="dashboard" element={<PartnerDashboardPage />} />
              <Route path="catalog" element={<PartnerCatalogPage />} />
              <Route path="cart" element={<PartnerCartPage />} />
              <Route path="checkout" element={<PartnerCheckoutPage />} />
              <Route path="orders" element={<PartnerOrdersPage />} />
              <Route path="orders/:id" element={<PartnerOrderDetailPage />} />
              <Route path="account" element={<PartnerAccountPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/partner/login" replace />} />
        </Routes>
      </PartnerCartProvider>
    </PartnerAuthProvider>
  );
}
