import { lazy, type ReactNode } from "react";
import { Route } from "react-router-dom";
import { OwnerOnlyRoute } from "@/components/auth/OwnerOnlyRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Proposals = lazy(() => import("@/pages/Proposals"));
const PitchPage = lazy(() => import("@/pages/dashboard/PitchPage"));
const PitchComparePage = lazy(() => import("@/pages/dashboard/PitchComparePage"));
const PitchExchangeRatesPage = lazy(() => import("@/pages/dashboard/PitchExchangeRatesPage"));
const PitchSharesPage = lazy(() => import("@/pages/dashboard/PitchSharesPage"));
const ProposalDetail = lazy(() => import("@/pages/ProposalDetail"));
const ProposalTemplateBuilderPage = lazy(() => import("@/pages/ProposalTemplateBuilderPage"));
const Products = lazy(() => import("@/pages/Products"));
const Packages = lazy(() => import("@/pages/Packages"));
const BundlesPage = lazy(() => import("@/pages/BundlesPage"));
const CompositeProductsPage = lazy(() => import("@/pages/CompositeProductsPage"));
const CompositeProductDetailPage = lazy(() => import("@/pages/CompositeProductDetailPage"));
const StockValuationPage = lazy(() => import("@/pages/StockValuationPage"));

export function SalesAssetsRoutes() {
  const pitchRoute = (children: ReactNode) => (
    <DashboardLayout>
      <OwnerOnlyRoute>{children}</OwnerOnlyRoute>
    </DashboardLayout>
  );

  return (
    <>
      <Route path="/dashboard/proposals" element={<Proposals />} />
      <Route path="/dashboard/pitch" element={pitchRoute(<PitchPage />)} />
      <Route path="/dashboard/pitch/compare" element={pitchRoute(<PitchComparePage />)} />
      <Route path="/dashboard/pitch/exchange-rates" element={pitchRoute(<PitchExchangeRatesPage />)} />
      <Route path="/dashboard/pitch/shares" element={pitchRoute(<PitchSharesPage />)} />

      <Route path="/dashboard/proposals/templates/:id" element={<ProposalTemplateBuilderPage />} />
      <Route path="/dashboard/proposals/:id" element={<ProposalDetail />} />
      <Route path="/dashboard/products" element={<Products />} />
      <Route path="/dashboard/b2b-products" element={<Products />} />
      <Route path="/dashboard/packages" element={<Packages />} />
      <Route path="/dashboard/bundles" element={<BundlesPage />} />
      <Route path="/dashboard/composite-products" element={<CompositeProductsPage />} />
      <Route path="/dashboard/composite-products/:id" element={<CompositeProductDetailPage />} />
      <Route path="/dashboard/stock-valuation" element={<StockValuationPage />} />
    </>
  );
}
