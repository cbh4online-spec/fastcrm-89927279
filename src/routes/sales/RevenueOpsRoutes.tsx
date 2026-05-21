import { lazy } from "react";
import { Route } from "react-router-dom";

const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const RenewalsPage = lazy(() => import("@/pages/RenewalsPage"));
const RenewalDetailPage = lazy(() => import("@/pages/RenewalDetailPage"));
const CollectionsInboxPage = lazy(() => import("@/modules/collections/pages/CollectionsInboxPage"));
const CollectionCaseDetailPage = lazy(() => import("@/modules/collections/pages/CollectionCaseDetailPage"));
const DunningSequencesPage = lazy(() => import("@/modules/collections/pages/DunningSequencesPage"));
const SafTImportPage = lazy(() => import("@/pages/imports/SafTImportPage"));

export function RevenueOpsRoutes() {
  return (
    <>
      <Route path="/dashboard/invoices" element={<Invoices />} />
      <Route path="/dashboard/imports/saft" element={<SafTImportPage />} />
      <Route path="/dashboard/invoices/:id" element={<InvoiceDetail />} />
      <Route path="/dashboard/payments" element={<Payments />} />
      <Route path="/dashboard/renewals" element={<RenewalsPage />} />
      <Route path="/dashboard/renewals/:id" element={<RenewalDetailPage />} />
      <Route path="/dashboard/collections" element={<CollectionsInboxPage />} />
      <Route path="/dashboard/collections/sequences" element={<DunningSequencesPage />} />
      <Route path="/dashboard/collections/:id" element={<CollectionCaseDetailPage />} />
    </>
  );
}
