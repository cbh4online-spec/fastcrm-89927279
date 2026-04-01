import { lazy } from "react";
import { Route } from "react-router-dom";

const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const RenewalsPage = lazy(() => import("@/pages/RenewalsPage"));
const RenewalDetailPage = lazy(() => import("@/pages/RenewalDetailPage"));

export function RevenueOpsRoutes() {
  return (
    <>
      <Route path="/dashboard/invoices" element={<Invoices />} />
      <Route path="/dashboard/invoices/:id" element={<InvoiceDetail />} />
      <Route path="/dashboard/payments" element={<Payments />} />
      <Route path="/dashboard/renewals" element={<RenewalsPage />} />
      <Route path="/dashboard/renewals/:id" element={<RenewalDetailPage />} />
    </>
  );
}
