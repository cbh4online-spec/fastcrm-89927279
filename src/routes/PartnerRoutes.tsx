import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PartnerCartProvider } from "@/contexts/PartnerCartContext";
import { PartnerAuthProvider } from "@/contexts/PartnerAuthContext";

const PartnerLoginPage = lazy(() => import("@/pages/partner/PartnerLoginPage"));
const PartnerDashboardPage = lazy(() => import("@/pages/partner/PartnerDashboardPage"));
const PartnerCatalogPage = lazy(() => import("@/pages/partner/PartnerCatalogPage"));
const PartnerCartPage = lazy(() => import("@/pages/partner/PartnerCartPage"));
const PartnerCheckoutPage = lazy(() => import("@/pages/partner/PartnerCheckoutPage"));
const PartnerOrdersPage = lazy(() => import("@/pages/partner/PartnerOrdersPage"));
const PartnerOrderDetailPage = lazy(() => import("@/pages/partner/PartnerOrderDetailPage"));
const PartnerAccountPage = lazy(() => import("@/pages/partner/PartnerAccountPage"));

function PartnerSuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function PartnerRoutes() {
  return (
    <PartnerAuthProvider>
      <PartnerCartProvider>
        <Suspense fallback={<PartnerSuspenseFallback />}>
          <Routes>
            <Route path="login" element={<PartnerLoginPage />} />
            <Route path="dashboard" element={<PartnerDashboardPage />} />
            <Route path="catalog" element={<PartnerCatalogPage />} />
            <Route path="cart" element={<PartnerCartPage />} />
            <Route path="checkout" element={<PartnerCheckoutPage />} />
            <Route path="orders" element={<PartnerOrdersPage />} />
            <Route path="orders/:id" element={<PartnerOrderDetailPage />} />
            <Route path="account" element={<PartnerAccountPage />} />
            <Route path="*" element={<Navigate to="/partner/login" replace />} />
          </Routes>
        </Suspense>
      </PartnerCartProvider>
    </PartnerAuthProvider>
  );
}
