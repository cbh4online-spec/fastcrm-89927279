import { lazy } from "react";
import { Route } from "react-router-dom";

const CheckoutFunnelsPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutFunnelsPage"));
const CheckoutOffersPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutOffersPage"));
const AbandonedCartsPage = lazy(() => import("@/pages/dashboard/checkout/AbandonedCartsPage"));
const CheckoutBundlesPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutBundlesPage"));
const CheckoutAnalyticsPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutAnalyticsPage"));
const ABTestsPage = lazy(() => import("@/pages/dashboard/checkout/ABTestsPage"));
const DynamicDiscountsPage = lazy(() => import("@/pages/dashboard/checkout/DynamicDiscountsPage"));
const RecoveryMetricsPage = lazy(() => import("@/pages/dashboard/checkout/RecoveryMetricsPage"));

export function CheckoutAdminRoutes() {
  return (
    <>
      <Route path="/dashboard/checkout" element={<CheckoutFunnelsPage />} />
      <Route path="/dashboard/checkout/offers" element={<CheckoutOffersPage />} />
      <Route path="/dashboard/checkout/abandoned" element={<AbandonedCartsPage />} />
      <Route path="/dashboard/checkout/bundles" element={<CheckoutBundlesPage />} />
      <Route path="/dashboard/checkout/analytics" element={<CheckoutAnalyticsPage />} />
      <Route path="/dashboard/checkout/ab-tests" element={<ABTestsPage />} />
      <Route path="/dashboard/checkout/discounts" element={<DynamicDiscountsPage />} />
      <Route path="/dashboard/checkout/recovery-metrics" element={<RecoveryMetricsPage />} />
      <Route path="/dashboard/checkout/:funnelId" element={<CheckoutFunnelDetailPage />} />
    </>
  );
}
