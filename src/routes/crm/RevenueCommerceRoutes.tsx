import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Marketplace = lazy(() => import("@/pages/Marketplace"));
const MarketplaceAdmin = lazy(() => import("@/pages/admin/MarketplaceAdmin"));
const SEOAdminPage = lazy(() => import("@/pages/dashboard/seo"));
const InstagramLooterPage = lazy(() => import("@/pages/dashboard/InstagramLooterPage"));
const CreditIntermediation = lazy(() => import("@/pages/CreditIntermediation"));
const StrategyPage = lazy(() => import("@/pages/StrategyPage"));
const DailyBriefPage = lazy(() => import("@/pages/DailyBriefPage"));
const VisionPage = lazy(() => import("@/pages/VisionPage"));
const ZapierPage = lazy(() => import("@/pages/ZapierPage"));
const BackgroundJobsPage = lazy(() => import("@/pages/BackgroundJobsPage"));
const CommandCenterV2Page = lazy(() => import("@/pages/CommandCenterV2Page"));
const FastClubApplicationsPage = lazy(() => import("@/pages/fastclub/FastClubApplicationsPage"));
const MobileQuickProductCreate = lazy(() => import("@/pages/MobileQuickProductCreate"));

export function RevenueCommerceRoutes() {
  return (
    <>
      {/* Marketplace */}
      <Route path="/dashboard/marketplace" element={<Marketplace />} />
      <Route path="/dashboard/admin/marketplace" element={<MarketplaceAdmin />} />

      {/* Dashboard misc */}
      <Route path="/dashboard/seo" element={<SEOAdminPage />} />
      <Route path="/dashboard/instagram-looter" element={<InstagramLooterPage />} />
      <Route path="/dashboard/instagram-looter/:tab" element={<InstagramLooterPage />} />
      <Route path="/dashboard/credit" element={<CreditIntermediation />} />
      <Route path="/dashboard/strategy" element={<StrategyPage />} />
      <Route path="/dashboard/daily-brief" element={<DailyBriefPage />} />
      <Route path="/dashboard/vision" element={<VisionPage />} />
      <Route path="/dashboard/zapier" element={<ZapierPage />} />
      <Route path="/dashboard/background-jobs" element={<BackgroundJobsPage />} />
      <Route path="/command-center" element={<CommandCenterV2Page />} />
      <Route path="/command-center/:conversationId" element={<CommandCenterV2Page />} />

      {/* FastClub redirect */}
      <Route path="/dashboard/fastclub" element={<Navigate to="/club/fastclub" replace />} />
      <Route path="/dashboard/fastclub/candidaturas" element={<FastClubApplicationsPage />} />
      <Route path="/dashboard/fastclub/*" element={<Navigate to="/club/fastclub" replace />} />

      {/* Mobile */}
      <Route path="/mobile/products/quick-create" element={<MobileQuickProductCreate />} />
    </>
  );
}
