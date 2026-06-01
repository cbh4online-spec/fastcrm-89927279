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
const CollectionsImportPage = lazy(() => import("@/modules/collections/pages/CollectionsImportPage"));
const SafTImportPage = lazy(() => import("@/pages/imports/SafTImportPage"));
const RentalsListPage = lazy(() => import("@/modules/rentals/pages/RentalsListPage"));
const RentalContractNewPage = lazy(() => import("@/modules/rentals/pages/RentalContractNewPage"));
const RentalContractDetailPage = lazy(() => import("@/modules/rentals/pages/RentalContractDetailPage"));
const EquipmentInventoryPage = lazy(() => import("@/modules/rentals/pages/EquipmentInventoryPage"));
const EquipmentUnitDetailPage = lazy(() => import("@/modules/rentals/pages/EquipmentUnitDetailPage"));

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
      <Route path="/dashboard/collections/import" element={<CollectionsImportPage />} />
      <Route path="/dashboard/collections/sequences" element={<DunningSequencesPage />} />
      <Route path="/dashboard/collections/:id" element={<CollectionCaseDetailPage />} />
      <Route path="/dashboard/rentals" element={<RentalsListPage />} />
      <Route path="/dashboard/rentals/new" element={<RentalContractNewPage />} />
      <Route path="/dashboard/rentals/equipment" element={<EquipmentInventoryPage />} />
      <Route path="/dashboard/rentals/equipment/:id" element={<EquipmentUnitDetailPage />} />
      <Route path="/dashboard/rentals/:id" element={<RentalContractDetailPage />} />
    </>
  );
}
