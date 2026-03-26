import { lazy } from "react";
import { Route } from "react-router-dom";

const ProcurementDashboardPage = lazy(() => import("@/pages/procurement/ProcurementDashboardPage"));
const SuppliersPage = lazy(() => import("@/pages/procurement/SuppliersPage"));
const PurchaseRequestsPage = lazy(() => import("@/pages/procurement/PurchaseRequestsPage"));
const PurchaseOrdersPage = lazy(() => import("@/pages/procurement/PurchaseOrdersPage"));
const GoodsReceiptsPage = lazy(() => import("@/pages/procurement/GoodsReceiptsPage"));
const SupplierInvoicesPage = lazy(() => import("@/pages/procurement/SupplierInvoicesPage"));
const SupplierProductsPage = lazy(() => import("@/pages/procurement/SupplierProductsPage"));
const SupplierPriceImportPage = lazy(() => import("@/pages/procurement/SupplierPriceImportPage"));
const ProcurementProjectsPage = lazy(() => import("@/pages/procurement/ProcurementProjectsPage"));
const ProcurementProjectDetailPage = lazy(() => import("@/pages/procurement/ProcurementProjectDetailPage"));
const RFQsPage = lazy(() => import("@/pages/procurement/RFQsPage"));
const RFQDetailPage = lazy(() => import("@/pages/procurement/RFQDetailPage"));
const RFQsDashboardPage = lazy(() => import("@/pages/procurement/RFQsDashboardPage"));
const ProcurementNeedsBoardPage = lazy(() => import("@/pages/procurement/ProcurementNeedsBoardPage"));

export function ProcurementRoutes() {
  return (
    <>
      <Route path="/dashboard/procurement" element={<ProcurementDashboardPage />} />
      <Route path="/dashboard/procurement/suppliers" element={<SuppliersPage />} />
      <Route path="/dashboard/procurement/requests" element={<PurchaseRequestsPage />} />
      <Route path="/dashboard/procurement/orders" element={<PurchaseOrdersPage />} />
      <Route path="/dashboard/procurement/receipts" element={<GoodsReceiptsPage />} />
      <Route path="/dashboard/procurement/invoices" element={<SupplierInvoicesPage />} />
      <Route path="/dashboard/procurement/catalog" element={<SupplierProductsPage />} />
      <Route path="/dashboard/procurement/price-import" element={<SupplierPriceImportPage />} />
      <Route path="/dashboard/procurement/projects" element={<ProcurementProjectsPage />} />
      <Route path="/dashboard/procurement/projects/:id" element={<ProcurementProjectDetailPage />} />
      <Route path="/dashboard/procurement/rfqs" element={<RFQsPage />} />
      <Route path="/dashboard/procurement/rfqs/:id" element={<RFQDetailPage />} />
      <Route path="/dashboard/procurement/rfqs-dashboard" element={<RFQsDashboardPage />} />
      <Route path="/dashboard/procurement/needs" element={<ProcurementNeedsBoardPage />} />
    </>
  );
}
