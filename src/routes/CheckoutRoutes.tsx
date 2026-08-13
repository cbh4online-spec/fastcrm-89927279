import { lazy, type ReactNode } from "react";
import { Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const CheckoutFunnelsPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutFunnelsPage"));
const CheckoutFunnelDetailPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutFunnelDetailPage"));
const CheckoutOffersPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutOffersPage"));
const AbandonedCartsPage = lazy(() => import("@/pages/dashboard/checkout/AbandonedCartsPage"));
const CheckoutBundlesPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutBundlesPage"));
const CheckoutAnalyticsPage = lazy(() => import("@/pages/dashboard/checkout/CheckoutAnalyticsPage"));
const ABTestsPage = lazy(() => import("@/pages/dashboard/checkout/ABTestsPage"));
const DynamicDiscountsPage = lazy(() => import("@/pages/dashboard/checkout/DynamicDiscountsPage"));
const RecoveryMetricsPage = lazy(() => import("@/pages/dashboard/checkout/RecoveryMetricsPage"));

/** Envolve cada página de checkout no layout do dashboard (barra lateral + topbar). */
const shell = (children: ReactNode) => <DashboardLayout>{children}</DashboardLayout>;

export function CheckoutAdminRoutes() {
  return (
    <>
      <Route path="/dashboard/checkout" element={shell(<CheckoutFunnelsPage />)} />
      <Route path="/dashboard/checkout/offers" element={shell(<CheckoutOffersPage />)} />
      <Route path="/dashboard/checkout/abandoned" element={shell(<AbandonedCartsPage />)} />
      <Route path="/dashboard/checkout/bundles" element={shell(<CheckoutBundlesPage />)} />
      <Route path="/dashboard/checkout/analytics" element={shell(<CheckoutAnalyticsPage />)} />
      <Route path="/dashboard/checkout/ab-tests" element={shell(<ABTestsPage />)} />
      <Route path="/dashboard/checkout/discounts" element={shell(<DynamicDiscountsPage />)} />
      <Route path="/dashboard/checkout/recovery-metrics" element={shell(<RecoveryMetricsPage />)} />
      <Route path="/dashboard/checkout/:funnelId" element={shell(<CheckoutFunnelDetailPage />)} />
    </>
  );
}
