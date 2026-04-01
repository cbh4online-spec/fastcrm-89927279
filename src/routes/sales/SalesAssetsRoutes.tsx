import { lazy } from "react";
import { Route } from "react-router-dom";

const Proposals = lazy(() => import("@/pages/Proposals"));
const ProposalDetail = lazy(() => import("@/pages/ProposalDetail"));
const ProposalTemplateBuilderPage = lazy(() => import("@/pages/ProposalTemplateBuilderPage"));
const Products = lazy(() => import("@/pages/Products"));
const Packages = lazy(() => import("@/pages/Packages"));
const BundlesPage = lazy(() => import("@/pages/BundlesPage"));

export function SalesAssetsRoutes() {
  return (
    <>
      <Route path="/dashboard/proposals" element={<Proposals />} />
      <Route path="/dashboard/proposals/templates/:id" element={<ProposalTemplateBuilderPage />} />
      <Route path="/dashboard/proposals/:id" element={<ProposalDetail />} />
      <Route path="/dashboard/products" element={<Products />} />
      <Route path="/dashboard/b2b-products" element={<Products />} />
      <Route path="/dashboard/packages" element={<Packages />} />
      <Route path="/dashboard/bundles" element={<BundlesPage />} />
    </>
  );
}
